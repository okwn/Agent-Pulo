// Trends repository — trend detection and tracking

import { eq, desc, and } from 'drizzle-orm';
import type { DB } from '../index.js';
import { trends, trendSources, type Trend, type NewTrend, type TrendSource, type NewTrendSource } from '../schema.js';

export const trendRepository = {
  async upsert(db: DB, data: NewTrend): Promise<Trend> {
    const existing = await db.select().from(trends)
      .where(and(eq(trends.title, data.title), eq(trends.category, data.category)))
      .limit(1);
    if (existing[0]) {
      const [row] = await db.update(trends).set({
        score: (existing[0]!.score ?? 0) + (data.score ?? 1),
        castCount: (existing[0]!.castCount ?? 0) + 1,
        lastSeenAt: new Date(),
      }).where(eq(trends.id, existing[0]!.id)).returning();
      return row!;
    }
    const [row] = await db.insert(trends).values(data).returning();
    return row!;
  },

  async findById(db: DB, id: string): Promise<Trend | undefined> {
    const result = await db.select().from(trends).where(eq(trends.id, id)).limit(1);
    return result[0];
  },

  async topByScore(db: DB, limit = 20): Promise<Trend[]> {
    return db.select().from(trends)
      .where(eq(trends.status, 'active'))
      .orderBy(desc(trends.score))
      .limit(limit);
  },

  async topByVelocity(db: DB, limit = 20): Promise<Trend[]> {
    return db.select().from(trends)
      .where(eq(trends.status, 'active'))
      .orderBy(desc(trends.velocity))
      .limit(limit);
  },

  async fade(db: DB, id: string): Promise<void> {
    await db.update(trends).set({ status: 'fading' }).where(eq(trends.id, id));
  },
};

export const trendSourceRepository = {
  async create(db: DB, data: NewTrendSource): Promise<TrendSource> {
    const [row] = await db.insert(trendSources).values(data).returning();
    return row!;
  },

  async byTrend(db: DB, trendId: string): Promise<TrendSource[]> {
    return db.select().from(trendSources).where(eq(trendSources.trendId, trendId));
  },

  async topSources(db: DB, trendId: string, limit = 10): Promise<TrendSource[]> {
    return db.select().from(trendSources)
      .where(eq(trendSources.trendId, trendId))
      .orderBy(desc(trendSources.engagementScore))
      .limit(limit);
  },
};