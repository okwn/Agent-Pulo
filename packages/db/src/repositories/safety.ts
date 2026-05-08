// Safety and rate limiting repository

import { eq } from 'drizzle-orm';
import type { DB } from '../index.js';
import { safetyFlags, rateLimitEvents, type NewSafetyFlag, type NewRateLimitEvent } from '../schema.js';

export const safetyRepository = {
  async flag(db: DB, data: NewSafetyFlag): Promise<typeof safetyFlags.$inferSelect> {
    const [row] = await db.insert(safetyFlags).values(data).returning();
    return row!;
  },

  async findByCastHash(db: DB, castHash: string): Promise<typeof safetyFlags.$inferSelect[]> {
    return db.select().from(safetyFlags).where(eq(safetyFlags.castHash, castHash));
  },

  async findByUser(db: DB, userId: number): Promise<typeof safetyFlags.$inferSelect[]> {
    return db.select().from(safetyFlags).where(eq(safetyFlags.userId, userId));
  },

  async clear(db: DB, id: string): Promise<void> {
    await db.update(safetyFlags).set({ status: 'cleared' }).where(eq(safetyFlags.id, id));
  },

  async escalate(db: DB, id: string): Promise<void> {
    await db.update(safetyFlags).set({ status: 'escalated' }).where(eq(safetyFlags.id, id));
  },
};

export const rateLimitRepository = {
  async record(db: DB, data: NewRateLimitEvent): Promise<typeof rateLimitEvents.$inferSelect> {
    const [row] = await db.insert(rateLimitEvents).values(data).returning();
    return row!;
  },

  async checkAndRecord(db: DB, key: string, decision: string): Promise<boolean> {
    await this.record(db, { key, window: 'minute', count: 1, decision, fid: null });
    return decision === 'allowed';
  },
};