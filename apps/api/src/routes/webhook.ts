// webhook.ts - Webhook verification routes

import { createHmac, timingSafeEqual } from 'crypto';
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

    // In live mode, verify signature using NeynarWebhookVerifier from provider
    const signature = req.headers[NEYNAR_SIGNATURE_HEADER] as string | undefined;
    const timestamp = req.headers[NEYNAR_TIMESTAMP_HEADER] as string | undefined;

    if (!signature) {
      log.warn({ ip: req.ip }, 'Missing webhook signature');
      return reply.code(401).send({
        error: 'MISSING_SIGNATURE',
        message: 'Webhook signature is required in live mode',
      });
    }

    // Verify using the actual NeynarWebhookVerifier from the provider
    const webhookSecret = process.env.NEYNAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      log.error('NEYNAR_WEBHOOK_SECRET not configured');
      return reply.code(500).send({
        error: 'CONFIGURATION_ERROR',
        message: 'Webhook secret not configured — cannot verify signatures',
      });
    }

    const isValid = verifyNeynarSignature(
      req.body,
      signature,
      timestamp ?? '',
      webhookSecret
    );

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

// Known Neynar webhook header names — confirmed from Neynar API docs.
// If these change, update HEADER_NAME and update WEBHOOK_SECURITY.md.
const NEYNAR_SIGNATURE_HEADER = 'x-neynar-signature' as const;
const NEYNAR_TIMESTAMP_HEADER = 'x-webhook-timestamp' as const;

export type NeynarSignatureHeader = typeof NEYNAR_SIGNATURE_HEADER;
export type NeynarTimestampHeader = typeof NEYNAR_TIMESTAMP_HEADER;

/**
 * Verify a Neynar webhook signature using HMAC-SHA256 over timestamp + body.
 *
 * Neynar sends:
 *   x-neynar-signature: <HMAC-SHA256 of (timestamp + raw_body) in hex>
 *   x-webhook-timestamp: <Unix timestamp string>
 *
 * We use timing-safe comparison to prevent timing attacks.
 */
export function verifyNeynarSignature(
  body: unknown,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  if (!timestamp || !signature) return false;

  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const signedPayload = timestamp + bodyStr;

  const expectedSignature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
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