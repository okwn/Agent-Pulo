// notifications/src/miniapp-notification-provider.ts — Mini App push notifications

import { createChildLogger } from '@pulo/observability';
import { getProvider } from '@pulo/farcaster';
import type { Alert, IAlertChannelProvider, DeliveryResult } from './types.js';

const log = createChildLogger('miniapp-provider');

export class MiniAppNotificationProvider implements IAlertChannelProvider {
  name = 'miniapp' as const;

  /**
   * Send a mini app notification via IFarcasterProvider notifications interface.
   */
  async send(alert: Alert, idempotencyKey: string): Promise<DeliveryResult> {
    try {
      const provider = getProvider();
      const notifications = provider.notifications;

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
