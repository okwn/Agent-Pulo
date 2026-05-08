// notifications/src/alert-throttle.ts — Alert frequency and daily limit enforcement

import { createChildLogger } from '@pulo/observability';
import type { Alert, ThrottleResult } from './types.js';

const log = createChildLogger('alert-throttle');

export class AlertThrottle {
  check(alert: Alert, prefs: { dailyAlertLimit: number; notificationFrequency: string }, todaySent: number): ThrottleResult {
    const limit = prefs.dailyAlertLimit ?? 50;

    if (todaySent >= limit) {
      log.info({ userId: alert.userId, limit, todaySent }, 'daily_alert_limit_reached');
      return {
        allowed: false,
        remaining: 0,
        blockedUntil: this.nextDayBoundary(),
        reason: 'daily_limit_reached',
      };
    }

    if (prefs.notificationFrequency === 'minimal') {
      const allowed = alert.type === 'weekly_digest' || alert.type === 'admin_message';
      return { allowed, remaining: allowed ? limit - todaySent : 0, reason: allowed ? undefined : 'minimal_frequency' };
    }

    return { allowed: true, remaining: limit - todaySent };
  }

  remainingToday(alert: Alert, prefs: { dailyAlertLimit: number }, todaySent: number): number {
    return Math.max(0, (prefs.dailyAlertLimit ?? 50) - todaySent);
  }

  private nextDayBoundary(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

export const alertThrottle = new AlertThrottle();
