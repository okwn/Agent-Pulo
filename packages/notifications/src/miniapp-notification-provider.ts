// notifications/src/miniapp-notification-provider.ts — Mini App push notifications

import { createChildLogger } from '@pulo/observability';
import { getProvider } from '@pulo/farcaster';
import type { Alert, IAlertChannelProvider, DeliveryResult } from './types.js';

const log = createChildLogger('miniapp-provider');

const NOTIFICATION_MODE = (process.env.PULO_NOTIFICATION_MODE ?? 'mock') as 'mock' | 'live';

export class MiniAppNotificationProvider implements IAlertChannelProvider {
  name = 'miniapp' as const;

  /**
   * Send a mini app notification via IFarcasterProvider notifications interface.
   * Only calls live provider when PULO_NOTIFICATION_MODE=live.
   * In mock mode, returns a mock success without calling the farcaster API.
   */
  async send(alert: Alert, idempotencyKey: string): Promise<DeliveryResult> {
    if (NOTIFICATION_MODE === 'mock') {
      log.debug({ alertId: alert.id, idempotencyKey }, 'miniapp: mock mode, skipping live call');
      return { channel: 'miniapp', success: true, deliveredAt: new Date() };
    }

    try {
      const provider = getProvider();
      const notifications = provider.notifications;

      if (!notifications) {
        log.error({ alertId: alert.id }, 'miniapp: no notifications interface on provider');
        return { channel: 'miniapp', success: false, errorCode: 'NO_NOTIFICATIONS_INTERFACE', deliveredAt: new Date() };
      }

      await notifications.sendMiniAppNotification(
        alert.userId,
        {
          title: alert.title,
          body: alert.body,
          targetUrl: `pulo://alerts/${alert.id}`,
        },
        idempotencyKey
      );

      log.info({ alertId: alert.id, idempotencyKey }, 'mini app notification sent');
      return { channel: 'miniapp', success: true, deliveredAt: new Date() };
    } catch (err) {
      const errCode = err instanceof Error ? err.message : 'MINIAPP_DELIVERY_FAILED';
      log.error({ err, alertId: alert.id }, 'mini app notification failed');
      return { channel: 'miniapp', success: false, errorCode: errCode, deliveredAt: new Date() };
    }
  }
}

export const miniAppNotificationProvider = new MiniAppNotificationProvider();
