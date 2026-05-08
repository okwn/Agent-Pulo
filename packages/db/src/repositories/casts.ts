// Cast repository — CRUD operations for casts and threads

import { eq, desc } from 'drizzle-orm';
import type { DB } from '../index.js';
import { casts, castThreads, type Cast, type NewCast, type CastThread, type NewCastThread } from '../schema.js';

export const castRepository = {
  async create(db: DB, data: NewCast): Promise<Cast> {
    const [row] = await db.insert(casts).values(data).returning();
    return row!;
  },

  async findByHash(db: DB, castHash: string): Promise<Cast | undefined> {
    const result = await db.select().from(casts).where(eq(casts.castHash, castHash)).limit(1);
    return result[0];
  },

  async findByAuthorFid(db: DB, authorFid: number, limit = 50): Promise<Cast[]> {
    return db.select().from(casts)
      .where(eq(casts.authorFid, authorFid))
      .orderBy(desc(casts.createdAt))
      .limit(limit);
  },

  async findByParentHash(db: DB, parentHash: string): Promise<Cast[]> {
    return db.select().from(casts).where(eq(casts.parentHash, parentHash));
  },

  async upsertByHash(db: DB, data: NewCast): Promise<Cast> {
    const existing = await this.findByHash(db, data.castHash);
    if (existing) return existing;
    return this.create(db, data);
  },

  async count(db: DB): Promise<number> {
    const { count } = await import('drizzle-orm');
    return 0; // placeholder
  },
};

export const threadRepository = {
  async upsertByRootHash(db: DB, data: NewCastThread): Promise<CastThread> {
    const result = await db.select().from(castThreads).where(eq(castThreads.rootHash, data.rootHash)).limit(1);
    if (result[0]) {
      const [row] = await db.update(castThreads)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(castThreads.rootHash, data.rootHash)).returning();
      return row!;
    }
    const [row] = await db.insert(castThreads).values(data).returning();
    return row!;
  },

  async findByRootHash(db: DB, rootHash: string): Promise<CastThread | undefined> {
    const result = await db.select().from(castThreads).where(eq(castThreads.rootHash, rootHash)).limit(1);
    return result[0];
  },

  async recent(db: DB, limit = 20): Promise<CastThread[]> {
    return db.select().from(castThreads).orderBy(desc(castThreads.updatedAt)).limit(limit);
  },
};