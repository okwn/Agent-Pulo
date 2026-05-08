// User repository — CRUD operations for users

import { eq, desc, sql } from 'drizzle-orm';
import type { DB } from '../index.js';
import { users, userPreferences, type User, type NewUser, type UserPreference } from '../schema.js';

export const userRepository = {
  async create(db: DB, data: NewUser): Promise<User> {
    const [row] = await db.insert(users).values(data).returning();
    return row!;
  },

  async findByFid(db: DB, fid: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.fid, fid)).limit(1);
    return result[0];
  },

  async findById(db: DB, id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  },

  async findByUsername(db: DB, username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  },

  async findAll(db: DB, limit = 100, offset = 0): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  },

  async update(db: DB, id: number, data: Partial<NewUser>): Promise<User> {
    const [row] = await db.update(users).set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id)).returning();
    return row!;
  },

  async upsertByFid(db: DB, data: NewUser): Promise<User> {
    const existing = await this.findByFid(db, data.fid);
    if (existing) {
      return this.update(db, existing.id, data);
    }
    return this.create(db, data);
  },

  async count(db: DB): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(row?.count ?? 0);
  },
};

export const preferencesRepository = {
  async upsertByUserId(db: DB, userId: number, data: Partial<UserPreference>): Promise<UserPreference> {
    const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (existing[0]) {
      const [row] = await db.update(userPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId)).returning();
      return row!;
    }
    const [row] = await db.insert(userPreferences).values({ userId, ...data }).returning();
    return row!;
  },

  async findByUserId(db: DB, userId: number): Promise<UserPreference | undefined> {
    const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    return result[0];
  },

  async findByFid(db: DB, fid: number): Promise<UserPreference | undefined> {
    const user = await userRepository.findByFid(db, fid);
    if (!user) return undefined;
    return this.findByUserId(db, user.id);
  },

  async updatePreferences(db: DB, preferencesId: number, data: Partial<UserPreference>): Promise<UserPreference> {
    const [row] = await db.update(userPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userPreferences.id, preferencesId)).returning();
    return row!;
  },
};