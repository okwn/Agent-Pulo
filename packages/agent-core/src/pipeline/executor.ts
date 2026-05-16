// pipeline/executor.ts — Action executor — runs the decided action and persists results

import type { AgentDecision, ActionResult, AgentContext } from '../types.js';
import { getProvider, withIdempotencyKey } from '@pulo/farcaster';
import { getDB, schema } from '@pulo/db';

const { replyDrafts, truthChecks, trends, alertDeliveries } = schema;

export class ActionExecutor {
  async execute(
    decision: AgentDecision,
    context: AgentContext,
    runId: string
  ): Promise<ActionResult> {
    try {
      const provider = getProvider();
      const act = decision.action;

      switch (act.action) {
        case 'publish_reply':
          return await this.publishReply(act, decision, context, runId);

        case 'save_draft':
          return this.saveDraft(act, context, runId);

        case 'create_truth_check':
          return this.createTruthCheck(act, context, runId);

        case 'create_trend':
          return this.createTrend(act, context, runId);

        case 'send_alert':
          return await this.sendAlert(act, context, runId);

        case 'ignore':
          return { status: 'ignored', output: { reason: act.reason } };

        case 'escalate_to_admin':
          return this.escalateToAdmin(act, context, runId);

        default:
          return { status: 'failed', output: null, error: `Unknown action` };
      }
    } catch (err) {
      return { status: 'failed', output: null, error: String(err) };
    }
  }

  private eventText(event: { type: string; castText?: string; message?: string }): string {
    return event.type === 'dm' ? (event.message ?? '') : (event.castText ?? '');
  }

  private castHash(event: { type: string; castHash?: string }, runId: string): string {
    if (event.type === 'dm') return `event-${runId}`;
    return event.castHash ?? `event-${runId}`;
  }

  private async publishReply(
    act: { action: 'publish_reply'; replyText: string },
    decision: AgentDecision,
    context: AgentContext,
    runId: string
  ): Promise<ActionResult> {
    const provider = getProvider();
    const text = act.replyText;

    if (!decision.postSafetyOk) {
      return { status: 'failed', output: null, error: 'post-safety check did not pass' };
    }

    if (decision.requiresApproval && context.user.plan === 'free') {
      return this.saveDraft({ action: 'save_draft', reason: 'free tier requires approval' }, context, runId);
    }

    const signerUuid = process.env.FARCASTER_BOT_SIGNER_UUID ?? '';
    const parentHash = context.event.type === 'mention' ? context.event.parentHash : null;

    const idempotencyKey = `publish-reply:${runId}`;

    try {
      const result = await withIdempotencyKey(idempotencyKey, async () => {
        if (parentHash) {
          return provider.write.publishReply(parentHash, text, { signerUuid, idempotencyKey });
        } else {
          return provider.write.publishCast(text, {
            signerUuid,
            idempotencyKey,
            channelId: context.event.type === 'mention' && context.event.channelId ? context.event.channelId : undefined,
          });
        }
      });
      return { status: 'published', output: { text, castHash: result.hash }, url: result.url };
    } catch (err) {
      return { status: 'failed', output: null, error: String(err) };
    }
  }

  private async saveDraft(
    act: { action: 'save_draft'; reason: string },
    context: AgentContext,
    runId: string
  ): Promise<ActionResult> {
    const db = getDB();
    const event = context.event;
    const castHash = this.castHash(event, runId);
    const text = this.eventText(event as { type: string; castText?: string; message?: string });

    try {
      await db.insert(replyDrafts).values({ castHash, text, status: 'pending', userId: 0 });
    } catch { /* non-fatal */ }

    return { status: 'draft', output: { reason: act.reason } };
  }

  private async createTruthCheck(
    act: { action: 'create_truth_check'; question: string; claim: string },
    context: AgentContext,
    runId: string
  ): Promise<ActionResult> {
    const db = getDB();

    try {
      await db.insert(truthChecks).values({ claimText: act.claim, status: 'pending' });
    } catch { /* non-fatal */ }

    return { status: 'truth_check_created', output: { claim: act.claim, question: act.question } };
  }

  private async createTrend(
    act: { action: 'create_trend'; topic: string; category: string },
    context: AgentContext,
    runId: string
  ): Promise<ActionResult> {
    const db = getDB();

    try {
      await db.insert(trends).values({
        title: act.topic,
        category: act.category as 'airdrop' | 'grant' | 'reward' | 'token' | 'program' | 'governance' | 'social',
        status: 'active',
      });
    } catch { /* non-fatal */ }

    return { status: 'trend_created', output: { topic: act.topic, category: act.category } };
  }

  private async sendAlert(
    act: { action: 'send_alert'; alertType: string; message: string },
    context: AgentContext,
    runId: string
  ): Promise<ActionResult> {
    const db = getDB();
    const provider = getProvider();

    try {
      await db.insert(alertDeliveries).values({ alertId: crypto.randomUUID(), channel: 'dm', status: 'pending', idempotencyKey: runId, userId: 0 });
    } catch { /* non-fatal */ }

    try {
      await provider.notifications.sendMiniAppNotification(
        context.event.fid,
        { title: act.alertType, body: act.message },
        `alert-${runId}`
      );
    } catch { /* non-fatal */ }

    return { status: 'alert_sent', output: { alertType: act.alertType, message: act.message } };
  }

  private async escalateToAdmin(
    act: { action: 'escalate_to_admin'; reason: string; priority: 'low' | 'medium' | 'high' },
    context: AgentContext,
    runId: string
  ): Promise<ActionResult> {
    const db = getDB();
    const castHash = this.castHash(context.event, runId);

    try {
      await db.insert(replyDrafts).values({
        castHash,
        text: `ESCALATION [${act.priority}]: ${act.reason}`,
        status: 'pending',
        userId: 0,
      });
    } catch { /* non-fatal */ }

    return { status: 'escalated', output: { reason: act.reason, priority: act.priority } };
  }
}

export const actionExecutor = new ActionExecutor();