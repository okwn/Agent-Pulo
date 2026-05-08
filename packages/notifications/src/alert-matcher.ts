// notifications/src/alert-matcher.ts — Decides if user should receive an alert

import { createChildLogger } from '@pulo/observability';
import type { Alert, AlertMatcherResult, AlertContext } from './types.js';

const log = createChildLogger('alert-matcher');

export class AlertMatcher {
  match(ctx: AlertContext): AlertMatcherResult {
    const { alert, userPrefs } = ctx;

    if (alert.type === 'scam_warning' && !userPrefs.allowedTopics.includes('scam_warning')) {
      return { shouldAlert: false, matchedTopics: [], blockedReason: 'user_not_opted_into_scam_alerts' };
    }

    if (userPrefs.allowedTopics.length > 0) {
      const alertTopic = alert.category ?? alert.type;
      if (!userPrefs.allowedTopics.includes(alertTopic) && !userPrefs.allowedTopics.includes('*')) {
        return { shouldAlert: false, matchedTopics: [], blockedReason: `topic_${alertTopic}_not_allowed` };
      }
    }

    if (userPrefs.blockedTopics.length > 0) {
      const alertTopic = alert.category ?? alert.type;
      if (userPrefs.blockedTopics.includes(alertTopic)) {
        return { shouldAlert: false, matchedTopics: [], blockedReason: `topic_${alertTopic}_blocked` };
      }
    }

    if (alert.riskLevel && !this.riskMatchesTolerance(alert.riskLevel, userPrefs.riskTolerance ?? 'medium')) {
      return { shouldAlert: false, matchedTopics: [], blockedReason: `risk_${alert.riskLevel}_filtered` };
    }

    if (userPrefs.notificationFrequency === 'minimal' && alert.type !== 'weekly_digest' && alert.type !== 'admin_message') {
      return { shouldAlert: false, matchedTopics: [], blockedReason: 'minimal_frequency_only_weekly' };
    }

    return { shouldAlert: true, matchedTopics: [] };
  }

  private riskMatchesTolerance(riskLevel: string, tolerance: string): boolean {
    const order = ['low', 'medium', 'high', 'critical'];
    const riskIdx = order.indexOf(riskLevel);
    const tolIdx = order.indexOf(tolerance);
    if (riskIdx < 0 || tolIdx < 0) return true;
    return riskIdx <= tolIdx;
  }
}

export const alertMatcher = new AlertMatcher();
