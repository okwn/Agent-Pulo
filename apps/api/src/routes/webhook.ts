// webhook.ts - Webhook verification routes

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getMode } from '@pulo/farcaster';
import { createChildLogger } from '@pulo/observability';

const log = createChildLogger('webhook');

// ─── Webhook Signature Verification ─────────────────────────────────────────────

export async function webhookRoutes(app: FastifyInstance) {

  // POST /api/webhook/farcaster - Neynar webhook endpoint
  app.post('/api/webhook/farcaster', async (req: FastifyRequest, reply: FastifyReply) => {
    const mode = getMode();

    // In mock mode, accept any request (for testing)
    if (mode === 'mock') {
      log.info({ body: req.body }, 'Mock mode: accepting webhook without verification');
      return { received: true, verified: false, mode: 'mock' };
    }

    // In live mode, verify signature
    const signature = req.headers['x-neynar-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;

    if (!signature) {
      log.warn({ ip: req.ip }, 'Missing webhook signature');
      return reply.code(401).send({
        error: 'MISSING_SIGNATURE',
        message: 'Webhook signature is required in live mode',
      });
    }

    // Verify using Neynar's verification logic
    // In production, this would verify against NEYNAR_WEBHOOK_SECRET
    const webhookSecret = process.env.NEYNAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      log.error('NEYNAR_WEBHOOK_SECRET not configured');
      return reply.code(500).send({
        error: 'CONFIGURATION_ERROR',
        message: 'Webhook verification not properly configured',
      });
    }

    // Neynar webhook signature verification
    const isValid = verifyNeynarSignature(req.body, signature, timestamp, webhookSecret);

    if (!isValid) {
      log.warn({ ip: req.ip, signature: signature.substring(0, 10) + '...' }, 'Invalid webhook signature');
      return reply.code(401).send({
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed',
      });
    }

    log.info({ verified: true }, 'Webhook signature verified');
    return { received: true, verified: true };
  });

  // POST /api/webhook/test - Test webhook (development only)
  app.post('/api/webhook/test', async (req: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Test webhook not available in production',
      });
    }

    const bodySchema = z.object({
      type: z.enum(['mention', 'cast', 'reaction']),
      fid: z.number().optional(),
      text: z.string().optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    log.info(parsed.data, 'Test webhook received');
    return { success: true, data: parsed.data };
  });
}

// ─── Neynar Signature Verification ───────────────────────────────────────────────

function verifyNeynarSignature(body: unknown, signature: string, timestamp: string, secret: string): boolean {
  // Neynar uses HMAC-SHA256 for webhook signature verification
  // The signature is computed over: timestamp + body
  try {
    const { createHmac, timingSafeEqual } = await import('crypto');

    if (!timestamp) return false;

    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const signedPayload = timestamp + bodyStr;
    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (err) {
    log.error({ err }, 'Error verifying webhook signature');
    return false;
  }
}

// ─── Signed Request Verification ─────────────────────────────────────────────────

export async function verifySignedRequest(
  body: unknown,
  signature: string,
  secret: string
): Promise<boolean> {
  const { createHmac, timingSafeEqual } = await import('crypto');

  try {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}