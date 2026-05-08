// notifications/src/user-preference-matcher.ts — Maps alert types to delivery channels

import { createChildLogger } from '@pulo/observability';
import type { Alert, DeliveryChannel } from './types.js';

const log = createChildLogger('user-preference-matcher');

export class UserPreferenceMatcher {
  allowedChannels(alert: Alert, prefs: { allowMiniAppNotifications: boolean; allowDirectCasts: boolean }): DeliveryChannel[] {
    const channels: DeliveryChannel[] = ['inbox'];

    if (prefs.allowMiniAppNotifications) {
      channels.push('miniapp');
    }

    if (prefs.allowDirectCasts) {
      channels.push('direct_cast');
    }

    log.debug({ userId: alert.userId, channels, alertType: alert.type }, 'allowed channels resolved');
    return channels;
  }

  isOptedIn(alert: Alert, prefs: { allowedTopics: string[] }): boolean {
    if (alert.type === 'scam_warning') {
      return prefs.allowedTopics.includes('scam_warning');
    }
    return true;
  }
}

export const userPreferenceMatcher = new UserPreferenceMatcher();
