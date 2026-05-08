// Radar repository — trend detection records

import { eq, desc, sql } from 'drizzle-orm';
import type { DB } from '../index.js';
import { radarTrends, radarTrendSources, radarKeywords, radarWatchedChannels, type RadarTrend, type NewRadarTrend, type RadarTrendSource, type NewRadarTrendSource } from '../schema.js';

export const radarTrendRepository = {
  async create(db: DB, data: NewRadarTrend): Promise<RadarTrend> {
    const [row] = await db.insert(radarTrends).values(data).returning();
    return row!;
  },

  async findById(db: DB, id: string): Promise<RadarTrend | undefined> {
    const result = await db.select().from(radarTrends).where(eq(radarTrends.id, id)).limit(1);
    return result[0];
  },

  async findByNormalizedTitle(db: DB, normalizedTitle: string): Promise<RadarTrend | undefined> {
    const result = await db.select().from(radarTrends).where(eq(radarTrends.normalizedTitle, normalizedTitle)).limit(1);
    return result[0];
  },

  async findByCategory(db: DB, category: 'claim' | 'reward_program' | 'token_launch' | 'airdrop' | 'grant' | 'hackathon' | 'scam_warning' | 'social_trend' | 'unknown', limit = 50): Promise<RadarTrend[]> {
    return db.select().from(radarTrends)
      .where(eq(radarTrends.category, category))
      .orderBy(desc(radarTrends.score))
      .limit(limit);
  },

  async findByStatus(db: DB, adminStatus: 'detected' | 'watching' | 'approved' | 'rejected' | 'alerted' | 'archived', limit = 50): Promise<RadarTrend[]> {
    return db.select().from(radarTrends)
      .where(eq(radarTrends.adminStatus, adminStatus))
      .orderBy(desc(radarTrends.score))
      .limit(limit);
  },

  async activeTrends(db: DB, limit = 100): Promise<RadarTrend[]> {
    return db.select().from(radarTrends)
      .orderBy(desc(radarTrends.score))
      .limit(limit);
  },

  async update(db: DB, id: string, data: Partial<RadarTrend>): Promise<RadarTrend> {
    const [row] = await db.update(radarTrends).set(data).where(eq(radarTrends.id, id)).returning();
    return row!;
  },

  async updateScore(db: DB, id: string, score: number, velocity: number, castCount: number): Promise<RadarTrend> {
    const [row] = await db.update(radarTrends).set({
      score,
      velocity,
      castCount,
      lastSeenAt: new Date(),
    }).where(eq(radarTrends.id, id)).returning();
    return row!;
  },

  async addSource(db: DB, trendId: string, source: Omit<NewRadarTrendSource, 'trendId'>): Promise<RadarTrendSource> {
    const [row] = await db.insert(radarTrendSources).values({ ...source, trendId }).returning();
    return row!;
  },

  async getSources(db: DB, trendId: string): Promise<RadarTrendSource[]> {
    return db.select().from(radarTrendSources).where(eq(radarTrendSources.trendId, trendId)).orderBy(desc(radarTrendSources.createdAt));
  },

  async setStatus(db: DB, id: string, adminStatus: 'detected' | 'watching' | 'approved' | 'rejected' | 'alerted' | 'archived'): Promise<RadarTrend> {
    return this.update(db, id, { adminStatus });
  },

  async recent(db: DB, limit = 50): Promise<RadarTrend[]> {
    return db.select().from(radarTrends).orderBy(desc(radarTrends.firstSeenAt)).limit(limit);
  },

  async approved(db: DB, limit = 50): Promise<RadarTrend[]> {
    return db.select().from(radarTrends)
      .where(eq(radarTrends.adminStatus, 'approved'))
      .orderBy(desc(radarTrends.score))
      .limit(limit);
  },
};

export const radarKeywordRepository = {
  async upsertKeyword(db: DB, keyword: string, category: 'claim' | 'reward_program' | 'token_launch' | 'airdrop' | 'grant' | 'hackathon' | 'scam_warning' | 'social_trend' | 'unknown', language = 'en'): Promise<void> {
    await db.insert(radarKeywords).values({ keyword, category, language })
      .onConflictDoUpdate({ target: radarKeywords.keyword, set: { category } });
  },

  async getActiveKeywords(db: DB): Promise<{ keyword: string; category: string; language: string }[]> {
    const result = await db.select({ keyword: radarKeywords.keyword, category: radarKeywords.category, language: radarKeywords.language })
      .from(radarKeywords).where(eq(radarKeywords.active, true));
    return result.map(r => ({ keyword: r.keyword, category: String(r.category), language: String(r.language) }));
  },
};

export const radarChannelRepository = {
  async upsertChannel(db: DB, channelId: string, name: string): Promise<void> {
    await db.insert(radarWatchedChannels).values({ channelId, name })
      .onConflictDoUpdate({ target: radarWatchedChannels.channelId, set: { name } });
  },

  async getActiveChannels(db: DB): Promise<{ channelId: string; name: string }[]> {
    const result = await db.select({ channelId: radarWatchedChannels.channelId, name: radarWatchedChannels.name })
      .from(radarWatchedChannels).where(eq(radarWatchedChannels.active, true));
    return result;
  },
};