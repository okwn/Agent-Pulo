// db/src/repositories/usage.ts — DB-backed usage tracking

import { eq, and, gte, lt, desc } from 'drizzle-orm';
import type { DB } from '../index.js';
import { userUsage, type NewUserUsage } from '../schema.js';

export const usageRepository = {
  async upsertUsage(db: DB, data: NewUserUsage): Promise<void> {
    await db.insert(userUsage).values(data).onConflictDoUpdate({
      target: [userUsage.userId, userUsage.action],
      set: {
        count: data.count,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });
  },

  async incrementUsage(
    db: DB,
    userId: number,
    action: 'mention_analysis' | 'reply_suggestion' | 'radar_alert' | 'truth_check' | 'direct_cast_attempt' | 'llm_token_usage',
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const existing = await this.getUsage(db, userId, action, periodStart);
    const newCount = (existing?.count ?? 0) + 1;
    await db.insert(userUsage).values({
      userId, action, count: newCount, periodStart, periodEnd,
    }).onConflictDoUpdate({
      target: [userUsage.userId, userUsage.action],
      set: { count: newCount, periodStart, periodEnd },
    });
    return newCount;
  },

  async getUsage(
    db: DB,
    userId: number,
    action: string,
    asOf: Date = new Date()
  ): Promise<{ count: number; periodStart: Date; periodEnd: Date } | null> {
    const result = await db
      .select()
      .from(userUsage)
      .where(
        and(
          eq(userUsage.userId, userId),
          eq(userUsage.action, action as 'mention_analysis' | 'reply_suggestion' | 'radar_alert' | 'truth_check' | 'direct_cast_attempt' | 'llm_token_usage'),
          gte(userUsage.periodStart, new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate()))
        )
      )
      .orderBy(desc(userUsage.periodStart))
      .limit(1);
    return result[0] ?? null;
  },

  async getAllUsage(
    db: DB,
    userId: number,
    asOf: Date = new Date()
  ): Promise<Array<{ action: string; count: number; periodStart: Date; periodEnd: Date }>> {
    return db
      .select({ action: userUsage.action, count: userUsage.count, periodStart: userUsage.periodStart, periodEnd: userUsage.periodEnd })
      .from(userUsage)
      .where(
        and(
          eq(userUsage.userId, userId),
          gte(userUsage.periodStart, new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate()))
        )
      );
  },

  async resetUsage(db: DB, userId: number, action: string): Promise<void> {
    await db
      .update(userUsage)
      .set({ count: 0, lastResetAt: new Date() })
      .where(and(eq(userUsage.userId, userId), eq(userUsage.action, action as 'mention_analysis')));
  },
};