// farcaster/webhook.ts — Webhook verification and normalization wrapper

import type { NormalizedEvent } from './normalize.js';
import type { IWebhookVerifier, WebhookVerificationResult } from './providers/interfaces.js';
import { getProvider } from './factory.js';

export interface WebhookHandlerResult {
  events: NormalizedEvent[];
  fid: number | undefined;
  verified: boolean;
}

export async function verifyAndNormalizeMention(
  body: string | Buffer,
  signature: string,
  timestamp?: string
): Promise<WebhookHandlerResult> {
  const provider = getProvider();
  const verifier = provider.webhook;

  const result = await verifier.verifyMentionWebhook({ body, signature, timestamp });

  if (!result.verified) {
    return { events: [], fid: undefined, verified: false };
  }

  const { normalizeNeynarWebhook } = await import('./normalize.js');
  const bodyStr = typeof body === 'string' ? body : body.toString();
  const events = normalizeNeynarWebhook(bodyStr, result.fid);

  return {
    events,
    fid: result.fid,
    verified: true,
  };
}

export async function verifyCastWebhook(
  body: string | Buffer,
  signature: string
): Promise<WebhookVerificationResult> {
  const provider = getProvider();
  const verifier = provider.webhook;

  if (!verifier.verifyCastWebhook) {
    return { verified: false, error: 'Cast webhook verification not supported' };
  }

  return verifier.verifyCastWebhook({ body, signature });
}