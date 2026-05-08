// notifications/src/delivery-logger.ts — Logs every delivery attempt

import { createChildLogger } from '@pulo/observability';
import { getDB, alertRepository } from '@pulo/db';
import type { Alert, DeliveryChannel, DeliveryResult } from './types.js';

const log = createChildLogger('alert-delivery-logger');

export interface DeliveryLogEntry {
  alertId: string;
  userId: number;
  channel: DeliveryChannel;
  idempotencyKey: string;
  status: 'sent' | 'failed';
  errorCode?: string;
  sentAt: Date;
}

export class AlertDeliveryLogger {
  async log(result: DeliveryResult, entry: DeliveryLogEntry): Promise<void> {
    try {
      const db = getDB();
      const channelMap: Record<DeliveryChannel, 'dm' | 'cast_reply' | 'miniapp' | 'email' | 'webhook'> = {
        inbox: 'dm',
        miniapp: 'miniapp',
        direct_cast: 'cast_reply',
      };
      await alertRepository.createDelivery(db, {
        alertId: entry.alertId,
        userId: entry.userId,
        channel: channelMap[entry.channel],
        status: result.success ? 'sent' : 'failed',
        idempotencyKey: entry.idempotencyKey,
        sentAt: entry.sentAt,
        errorCode: result.errorCode,
      });
      log.info({ alertId: entry.alertId, channel: entry.channel, success: result.success }, 'delivery_logged');
    } catch (err) {
      log.error({ err, entry }, 'failed to log delivery');
    }
  }

  async logInboxDelivery(alert: Alert, idempotencyKey: string): Promise<void> {
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
      log.debug({ alertId: alert.id }, 'inbox delivery logged');
    } catch (err) {
      log.error({ err, alertId: alert.id }, 'inbox delivery log failed');
    }
  }
}

export const alertDeliveryLogger = new AlertDeliveryLogger();
