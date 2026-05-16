// notifications/src/direct-cast-provider.ts — Direct Cast / DM via farcaster write API

import { createChildLogger } from '@pulo/observability';
import { getProvider } from '@pulo/farcaster';
import type { Alert, IAlertChannelProvider, DeliveryResult } from './types.js';

const log = createChildLogger('direct-cast-provider');

const NOTIFICATION_MODE = (process.env.PULO_NOTIFICATION_MODE ?? 'mock') as 'mock' | 'live';

export class DirectCastProvider implements IAlertChannelProvider {
  name = 'direct_cast' as const;

  /**
   * Send a direct cast (DM) via IFarcasterProvider write interface.
   * Only calls live provider when PULO_NOTIFICATION_MODE=live.
   * In mock mode, returns a mock success without calling the farcaster API.
   */
  async send(alert: Alert, idempotencyKey: string): Promise<DeliveryResult> {
    if (NOTIFICATION_MODE === 'mock') {
      log.debug({ alertId: alert.id, idempotencyKey }, 'direct_cast: mock mode, skipping live call');
      return { channel: 'direct_cast', success: true, deliveredAt: new Date() };
    }

    try {
      const provider = getProvider();
      const notifications = provider.notifications;

      if (!notifications) {
        log.error({ alertId: alert.id }, 'direct_cast: no notifications interface on provider');
        return { channel: 'direct_cast', success: false, errorCode: 'NO_NOTIFICATIONS_INTERFACE', deliveredAt: new Date() };
      }

      await notifications.sendDirectCast(
        alert.userId,
        { message: alert.body },
        idempotencyKey
      );

      log.info({ alertId: alert.id, userId: alert.userId, idempotencyKey }, 'direct cast sent');
      return { channel: 'direct_cast', success: true, deliveredAt: new Date() };
    } catch (err) {
      const errCode = err instanceof Error ? err.message : 'DIRECT_CAST_FAILED';
      log.error({ err, alertId: alert.id, userId: alert.userId }, 'direct cast failed');
      return { channel: 'direct_cast', success: false, errorCode: errCode, deliveredAt: new Date() };
    }
  }
}

export const directCastProvider = new DirectCastProvider();
