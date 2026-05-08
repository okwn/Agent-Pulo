// notifications/src/direct-cast-provider.ts — Direct Cast / DM via farcaster write API

import { createChildLogger } from '@pulo/observability';
import { getProvider } from '@pulo/farcaster';
import type { Alert, IAlertChannelProvider, DeliveryResult } from './types.js';

const log = createChildLogger('direct-cast-provider');

export class DirectCastProvider implements IAlertChannelProvider {
  name = 'direct_cast' as const;

  /**
   * Send a direct cast (DM) via IFarcasterProvider write interface.
   */
  async send(alert: Alert, idempotencyKey: string): Promise<DeliveryResult> {
    try {
      const provider = getProvider();

      await provider.notifications.sendDirectCast(
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
