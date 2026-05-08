// worker/src/mention-job.ts — BullMQ job processor for @pulo mention events

import { Worker, Queue } from 'bullmq';
import { createChildLogger } from '@pulo/observability';
import { validateEnv } from '@pulo/shared';
import { getProvider } from '@pulo/farcaster';
import { verifyAndNormalizeMention } from '@pulo/farcaster';
import { agentOrchestrator } from '@pulo/agent-core';
import { publicReplyFormatter, dashboardLinkGenerator } from '@pulo/agent-core';
import { alertRepository } from '@pulo/db';
import { getDB } from '@pulo/db';
import type { NormalizedEvent } from '@pulo/farcaster';

const logger = createChildLogger('mention-job');
const env = validateEnv();

// Idempotency key for mention events
function buildMentionIdemKey(castHash: string, runId: string): string {
  return `mention:${castHash}:${runId}`;
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export const mentionQueue = new Queue('pulo-mentions', {
  connection: {
    host: (env.REDIS_URL ?? 'redis://localhost:6388').replace('redis://', '').split(':')[0] || 'localhost',
    port: parseInt(process.env.PULO_REDIS_PORT ?? '6388', 10),
  },
});

// ─── Job data types ───────────────────────────────────────────────────────────

export interface MentionJobData {
  body: string;
  signature: string;
  timestamp?: string;
  source: 'webhook' | 'api';
}

// ─── Enqueue ────────────────────────────────────────────────────────────────

export async function enqueueMention(body: string, signature: string, timestamp?: string): Promise<string> {
  const job = await mentionQueue.add('process', { body, signature, timestamp, source: 'webhook' } as MentionJobData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  logger.info({ jobId: job.id }, 'Mention job enqueued');
  return job.id!;
}

// ─── Worker ────────────────────────────────────────────────────────────────

export function startMentionWorker(): Worker {
  const worker = new Worker('pulo-mentions', async (job) => {
    const { body, signature, timestamp } = job.data as MentionJobData;
    const runId = job.id ?? crypto.randomUUID();

    logger.info({ jobId: job.id, runId }, 'Processing mention job');

    // Step 1: Verify webhook signature
    const verifyResult = await verifyAndNormalizeMention(body, signature, timestamp);
    if (!verifyResult.verified) {
      logger.warn({ runId }, 'Mention webhook verification failed');
      throw new Error('WEBHOOK_VERIFICATION_FAILED');
    }

    // Step 2: Check idempotency — don't process same event twice
    for (const event of verifyResult.events) {
      const castHash = event.type === 'dm' ? String(event.fid) : event.castHash;
      const idemKey = buildMentionIdemKey(castHash, runId);
      const existing = await checkMentionIdempotency(castHash);
      if (existing) {
        logger.info({ eventHash: castHash, runId }, 'Duplicate mention event, skipping');
        continue;
      }
      await markMentionProcessed(castHash, idemKey);

      // Step 3: Run orchestrator
      try {
        const decision = await agentOrchestrator.process(event, castHash);

        // Step 4: Format public reply (if applicable)
        if (decision.action.action === 'ignore') {
          logger.debug({ runId }, 'Mention action: ignore — no reply sent');
          continue;
        }

        // Get user context for formatting
        const ctx = {
          event,
          user: { fid: event.fid, username: event.username, displayName: 'displayName' in event ? event.displayName ?? null : null, plan: 'free' as const },
          preferences: null,
          relatedThread: null,
          cast: null,
          userCasts: [],
          mentionedCasts: [],
          recentCasts: [],
          relevantTrends: [],
          createdAt: new Date(),
        };

        const replyText = publicReplyFormatter.format(decision, ctx);

        // Step 5: Publish reply (if not empty)
        if (replyText.length > 0) {
          const publishResult = await publishMentionReply(event, replyText, runId);

          if (!publishResult.success && decision.requiresApproval) {
            // Save as draft if publish failed and requires approval
            await saveReplyDraft(event, replyText, runId, decision);
          }

          // Log delivery
          await logMentionDelivery(event, replyText, publishResult, runId);
        }

        // Step 6: Create truth check if needed
        if (decision.action.action === 'create_truth_check') {
          const truthCheckId = await createTruthCheckRecord(event, runId);
          logger.info({ truthCheckId, runId }, 'Truth check created from mention');
        }

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err, runId }, 'Mention processing failed');
        throw err; // re-throw for BullMQ retry
      }
    }

    return { success: true, runId, events: verifyResult.events.length };
  }, {
    connection: {
      host: (env.REDIS_URL ?? 'redis://localhost:6388').replace('redis://', '').split(':')[0] || 'localhost',
      port: parseInt(process.env.PULO_REDIS_PORT ?? '6388', 10),
    },
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Mention job failed');
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Mention job completed');
  });

  logger.info('Mention worker started');
  return worker;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function checkMentionIdempotency(eventHash: string): Promise<boolean> {
  try {
    const db = getDB();
    const existing = await alertRepository.findDeliveryByIdempotencyKey(db, `mention:${eventHash}`);
    return !!existing;
  } catch {
    return false;
  }
}

async function markMentionProcessed(eventHash: string, idemKey: string): Promise<void> {
  try {
    const db = getDB();
    await alertRepository.createDelivery(db, {
      alertId: idemKey,
      userId: 0, // mention events may not have a userId yet
      channel: 'dm',
      status: 'sent',
      idempotencyKey: `mention:${eventHash}`,
      sentAt: new Date(),
    });
  } catch (err) {
    logger.debug({ err, eventHash }, 'Idempotency mark failed (non-fatal)');
  }
}

async function publishMentionReply(
  event: NormalizedEvent,
  replyText: string,
  runId: string
): Promise<{ success: boolean; errorCode?: string }> {
  try {
    const provider = getProvider();
    let parentHash: string;
    if (event.type === 'mention' || event.type === 'reply') {
      parentHash = event.parentHash ?? event.castHash;
    } else {
      parentHash = String(event.fid);
    }
    const signerUuid = process.env.PULO_SIGNER_UUID ?? '';

    await provider.write.publishReply(parentHash, replyText, { signerUuid, idempotencyKey: `reply:${runId}` });

    logger.info({ runId, parentHash, replyLength: replyText.length }, 'Mention reply published');
    return { success: true };
  } catch (err) {
    const errCode = err instanceof Error ? err.message : 'PUBLISH_FAILED';
    logger.error({ err, runId }, 'Mention reply publish failed');
    return { success: false, errorCode: errCode };
  }
}

async function saveReplyDraft(
  event: NormalizedEvent,
  _replyText: string,
  runId: string,
  _decision: ReturnType<typeof agentOrchestrator.process> extends Promise<infer T> ? T : never
): Promise<void> {
  try {
    const db = getDB();
    const hash = event.type === 'dm' ? String(event.fid) : event.castHash;
    await alertRepository.createDelivery(db, {
      alertId: runId,
      userId: event.fid,
      channel: 'dm',
      status: 'pending',
      idempotencyKey: `draft:${hash ?? runId}`,
      sentAt: null,
    });
    logger.info({ runId }, 'Reply draft saved');
  } catch (err) {
    logger.error({ err, runId }, 'Failed to save reply draft');
  }
}

async function createTruthCheckRecord(event: NormalizedEvent, runId: string): Promise<string> {
  // TODO: integrate with truth check workflow from Phase 07
  const hash = event.type === 'dm' ? String(event.fid) : event.castHash;
  logger.info({ runId, eventHash: hash }, 'Truth check record would be created here');
  return runId;
}

async function logMentionDelivery(
  event: NormalizedEvent,
  replyText: string,
  result: { success: boolean; errorCode?: string },
  runId: string
): Promise<void> {
  try {
    const db = getDB();
    await alertRepository.createDelivery(db, {
      alertId: runId,
      userId: event.fid,
      channel: 'cast_reply',
      status: result.success ? 'sent' : 'failed',
      idempotencyKey: `delivery:${runId}`,
      sentAt: result.success ? new Date() : null,
      errorCode: result.errorCode,
    });
  } catch (err) {
    logger.error({ err, runId }, 'Failed to log mention delivery');
  }
}
