// Truth checks repository — fact-check records

import { eq, desc } from 'drizzle-orm';
import type { DB } from '../index.js';
import { truthChecks, type TruthCheck, type NewTruthCheck } from '../schema.js';

export const truthCheckRepository = {
  async create(db: DB, data: NewTruthCheck): Promise<TruthCheck> {
    const [row] = await db.insert(truthChecks).values(data).returning();
    return row!;
  },

  async findById(db: DB, id: string): Promise<TruthCheck | undefined> {
    const result = await db.select().from(truthChecks).where(eq(truthChecks.id, id)).limit(1);
    return result[0];
  },

  async findByTargetCastHash(db: DB, targetCastHash: string): Promise<TruthCheck | undefined> {
    const result = await db.select().from(truthChecks).where(eq(truthChecks.targetCastHash, targetCastHash)).limit(1);
    return result[0];
  },

  async findByUser(db: DB, userId: number, limit = 50): Promise<TruthCheck[]> {
    return db.select().from(truthChecks)
      .where(eq(truthChecks.userId, userId))
      .orderBy(desc(truthChecks.createdAt))
      .limit(limit);
  },

  async pending(db: DB, limit = 50): Promise<TruthCheck[]> {
    return db.select().from(truthChecks)
      .where(eq(truthChecks.status, 'pending'))
      .orderBy(truthChecks.createdAt)
      .limit(limit);
  },

  async updateResult(db: DB, id: string, data: {
    verdict?: 'verified' | 'likely_true' | 'uncertain' | 'likely_false' | 'debunked';
    confidence?: number;
    evidenceSummary?: string;
    counterEvidenceSummary?: string;
    sourceCastHashes?: string[];
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    status?: string;
  }): Promise<TruthCheck> {
    const [row] = await db.update(truthChecks).set(data)
      .where(eq(truthChecks.id, id)).returning();
    return row!;
  },

  async recent(db: DB, limit = 50): Promise<TruthCheck[]> {
    return db.select().from(truthChecks)
      .orderBy(desc(truthChecks.createdAt))
      .limit(limit);
  },
};