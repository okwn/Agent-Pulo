// apps/api/src/routes/farcaster.ts — Far provider health and webhook routes
import type { FastifyInstance } from 'fastify';
import { getProvider, setMode, getMode, type FarMode } from '@pulo/farcaster';
import { getDB, schema } from '@pulo/db';

const { agentEvents } = schema;

export async function farcasterRoutes(fastify: FastifyInstance) {
  // GET /api/farcaster/health — provider health check
  fastify.get('/api/farcaster/health', async (request, reply) => {
    let status: 'ok' | 'degraded' = 'ok';
    let providerName = 'unknown';
    let mode: FarMode = 'mock';
    let errorMessage: string | undefined;

    try {
      const provider = getProvider();
      mode = getMode();
      providerName = provider.providerName;

      if (provider.mode === 'live') {
        await provider.getUserByUsername('pulo_bot').catch(() => {
          // non-fatal — just means we can't reach Neynar right now
        });
      }
    } catch (err) {
      status = 'degraded';
      errorMessage = String(err);
    }

    return reply.send({ status, provider: providerName, mode, error: errorMessage });
  });

  // POST /api/webhooks/farcaster/mentions — incoming mention webhook
  fastify.post('/api/webhooks/farcaster/mentions', async (request, reply) => {
    const provider = getProvider();
    const body = request.body;

    const signature = request.headers['x-sig'] as string ?? '';
    const timestamp = request.headers['x-timestamp'] as string | undefined;

    const verifier = provider.webhook;
    const { normalizeNeynarWebhook } = await import('@pulo/farcaster');

    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const verifyResult = await verifier.verifyMentionWebhook({
      body: rawBody,
      signature,
      timestamp,
    });

    if (!verifyResult.verified) {
      return reply.status(401).send({ error: 'Signature verification failed' });
    }

    const fid = verifyResult.fid ?? 0;
    const events = normalizeNeynarWebhook(rawBody, fid);

    const db = getDB();

    for (const event of events) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = event as any as Record<string, unknown>;
        await db.insert(agentEvents).values({
          source: 'webhook',
          type: 'mention',
          fid: event.fid,
          payload,
          status: 'pending',
        });
      } catch {
        // non-fatal — don't block the webhook response
      }
    }

    return reply.send({ received: true, eventCount: events.length });
  });

  // POST /api/admin/mock/farcaster/mention — inject a mock mention (dev only)
  fastify.post('/api/admin/mock/farcaster/mention', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: 'Not found' });
    }

    setMode('mock');
    const provider = getProvider();

    if (provider.mode !== 'mock') {
      return reply.status(400).send({ error: 'Not in mock mode' });
    }

    const { fid = 1234, text = 'test mention' } = request.body as Record<string, unknown>;

    const mockBody = JSON.stringify({
      type: 'mention',
      data: {
        cast: {
          hash: `mock-${Date.now()}`,
          text,
          author: { fid, username: 'test_user', display_name: 'Test User' },
          timestamp: new Date().toISOString(),
        },
      },
      fid,
    });

    const { normalizeNeynarWebhook } = await import('@pulo/farcaster');
    const events = normalizeNeynarWebhook(mockBody, fid as number);

    const db = getDB();

    for (const event of events) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = event as any as Record<string, unknown>;
      await db.insert(agentEvents).values({
        source: 'api',
        type: 'mention',
        fid: event.fid,
        payload,
        status: 'pending',
      });
    }

    return reply.send({ received: true, eventCount: events.length });
  });
}