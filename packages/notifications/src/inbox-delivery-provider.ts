// notifications/src/inbox-delivery-provider.ts — Always-available inbox delivery

import { createChildLogger } from '@pulo/observability';
import { getDB, alertRepository } from '@pulo/db';
import type { Alert, IAlertChannelProvider, DeliveryResult } from './types.js';

const log = createChildLogger('inbox-provider');

export class InboxDeliveryProvider implements IAlertChannelProvider {
  name = 'inbox' as const;

  async send(alert: Alert, idempotencyKey: string): Promise<DeliveryResult> {
    try {
      const db = getDB();
      await alertRepository.createDelivery(db, {
        alertId: alert.id,
        userId: alert.userId,
        channel: 'dm',
        status: 'sent',
        idempotencyKey,
        sentAt: new Date(),
      });
      log.info({ alertId: alert.id, idempotencyKey }, 'inbox delivery sent');
      return { channel: 'inbox', success: true, deliveredAt: new Date() };
    } catch (err) {
      log.error({ err, alertId: alert.id }, 'inbox delivery failed');
      return { channel: 'inbox', success: false, errorCode: 'INBOX_DELIVERY_FAILED', deliveredAt: new Date() };
    }
  }
}

export const inboxDeliveryProvider = new InboxDeliveryProvider();
