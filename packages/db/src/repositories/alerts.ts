// Alerts repository — alert records and delivery tracking

import { eq, desc, and } from 'drizzle-orm';
import type { DB } from '../index.js';
import { alerts, alertDeliveries, type Alert as DBAlert, type NewAlert, type AlertDelivery, type NewAlertDelivery } from '../schema.js';

export const alertRepository = {
  // ─── Alerts ───────────────────────────────────────────────────────────────

  async create(db: DB, data: NewAlert): Promise<DBAlert> {
    const [row] = await db.insert(alerts).values(data).returning();
    return row!;
  },

  async findById(db: DB, id: string): Promise<DBAlert | undefined> {
    const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
    return result[0];
  },

  async findByUser(db: DB, userId: number, limit = 50): Promise<DBAlert[]> {
    return db.select().from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
  },

  async findUnread(db: DB, userId: number, limit = 50): Promise<DBAlert[]> {
    return db.select().from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
  },

  async markRead(db: DB, id: string): Promise<void> {
    await db.update(alerts).set({ readAt: new Date() }).where(eq(alerts.id, id));
  },

  async delete(db: DB, id: string): Promise<void> {
    await db.delete(alerts).where(eq(alerts.id, id));
  },

  // ─── Deliveries ──────────────────────────────────────────────────────────

  async createDelivery(db: DB, data: NewAlertDelivery): Promise<AlertDelivery> {
    const [row] = await db.insert(alertDeliveries).values(data).returning();
    return row!;
  },

  async findDeliveryByIdempotencyKey(db: DB, key: string): Promise<AlertDelivery | undefined> {
    const result = await db.select().from(alertDeliveries).where(eq(alertDeliveries.idempotencyKey, key)).limit(1);
    return result[0];
  },

  async findDeliveriesByAlert(db: DB, alertId: string): Promise<AlertDelivery[]> {
    return db.select().from(alertDeliveries)
      .where(eq(alertDeliveries.alertId, alertId))
      .orderBy(desc(alertDeliveries.sentAt));
  },

  async findDeliveriesByUser(db: DB, userId: number, limit = 50): Promise<AlertDelivery[]> {
    return db.select().from(alertDeliveries)
      .where(eq(alertDeliveries.userId, userId))
      .orderBy(desc(alertDeliveries.sentAt))
      .limit(limit);
  },

  async markDeliverySent(db: DB, id: string): Promise<void> {
    await db.update(alertDeliveries)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(alertDeliveries.id, id));
  },

  async markDeliveryFailed(db: DB, id: string, errorCode: string): Promise<void> {
    await db.update(alertDeliveries)
      .set({ status: 'failed', errorCode })
      .where(eq(alertDeliveries.id, id));
  },

  async markDeliveryOpened(db: DB, id: string): Promise<void> {
    await db.update(alertDeliveries)
      .set({ status: 'opened', openedAt: new Date() })
      .where(eq(alertDeliveries.id, id));
  },

  async countTodayByUser(db: DB, userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db.select().from(alertDeliveries)
      .where(and(
        eq(alertDeliveries.userId, userId),
        eq(alertDeliveries.status, 'sent')
      ));
    return result.filter(r => r.sentAt && new Date(r.sentAt) >= today).length;
  },
};
