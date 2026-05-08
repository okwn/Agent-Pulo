// notifications/src/delivery-planner.ts — Orchestrates delivery across all channels

import { createChildLogger } from '@pulo/observability';
import type { SubscriptionTier } from './types.js';
import type { Alert, AlertContext, DeliveryPlan, DeliveryPlannerResult, DeliveryChannel, IAlertChannelProvider } from './types.js';
import { alertMatcher } from './alert-matcher.js';
import { userPreferenceMatcher } from './user-preference-matcher.js';
import { alertThrottle } from './alert-throttle.js';
import { alertDeliveryLogger } from './delivery-logger.js';
import { inboxDeliveryProvider } from './inbox-delivery-provider.js';
import { miniAppNotificationProvider } from './miniapp-notification-provider.js';
import { directCastProvider } from './direct-cast-provider.js';
import { alertRepository } from '@pulo/db';

const log = createChildLogger('delivery-planner');

export class DeliveryPlanner {
  private providers: Record<DeliveryChannel, IAlertChannelProvider> = {
    inbox: inboxDeliveryProvider,
    miniapp: miniAppNotificationProvider,
    direct_cast: directCastProvider,
  };

  async plan(ctx: AlertContext, todaySent: number): Promise<DeliveryPlannerResult> {
    const { alert, userPrefs, subscription } = ctx;
    const plans: DeliveryPlan[] = [];
    const blockedPlans: { plan: DeliveryPlan; reason: string }[] = [];

    const match = alertMatcher.match(ctx);
    if (!match.shouldAlert) {
      log.debug({ alertId: alert.id, blockedReason: match.blockedReason }, 'alert filtered by matcher');
      return { plans: [], blockedPlans: [], totalDaily: todaySent };
    }

    const throttle = alertThrottle.check(alert, userPrefs, todaySent);
    if (!throttle.allowed) {
      return {
        plans: [],
        blockedPlans: [{ plan: { channel: 'inbox' as DeliveryChannel, alert, idempotencyKey: '', reason: throttle.reason! }, reason: throttle.reason! }],
        totalDaily: todaySent,
      };
    }

    const idempotencyKey = this.buildIdempotencyKey(alert);
    const alreadySent = await this.checkIdempotency(alert.id, alert.userId);
    if (alreadySent) {
      log.info({ alertId: alert.id, userId: alert.userId }, 'duplicate delivery blocked');
      return { plans: [], blockedPlans: [], totalDaily: todaySent };
    }

    const allowed = userPreferenceMatcher.allowedChannels(alert, userPrefs);
    const tier = subscription?.tier ?? null;

    for (const channel of allowed) {
      const plan = this.buildPlan(alert, channel, idempotencyKey, userPrefs, tier);
      if (plan) plans.push(plan);
    }

    return { plans, blockedPlans: [], totalDaily: todaySent };
  }

  async deliver(plans: DeliveryPlan[]): Promise<void> {
    for (const plan of plans) {
      const provider = this.providers[plan.channel];
      if (!provider) continue;
      const result = await provider.send(plan.alert, plan.idempotencyKey);
      await alertDeliveryLogger.log(result, {
        alertId: plan.alert.id,
        userId: plan.alert.userId,
        channel: plan.channel,
        idempotencyKey: plan.idempotencyKey,
        status: result.success ? 'sent' : 'failed',
        errorCode: result.errorCode,
        sentAt: result.deliveredAt ?? new Date(),
      });
    }
  }

  private buildPlan(alert: Alert, channel: DeliveryChannel, idempotencyKey: string, userPrefs: AlertContext['userPrefs'], tier: SubscriptionTier | null): DeliveryPlan | null {
    if (channel === 'direct_cast') {
      if (!userPrefs.allowDirectCasts) return null;
      if (tier === 'free') return null;
    }
    return { channel, alert, idempotencyKey, reason: 'ok' };
  }

  private buildIdempotencyKey(alert: Alert): string {
    return `alert:${alert.id}:${alert.userId}`;
  }

  private async checkIdempotency(alertId: string, userId: number): Promise<boolean> {
    try {
      const db = (await import('@pulo/db')).getDB();
      const key = `alert:${alertId}:${userId}`;
      const record = await alertRepository.findDeliveryByIdempotencyKey(db, key);
      return !!record;
    } catch { return false; }
  }
}

export const deliveryPlanner = new DeliveryPlanner();
