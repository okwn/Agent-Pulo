// Events and runs repository — agent event log and LLM run tracking

import { eq, desc } from 'drizzle-orm';
import type { DB } from '../index.js';
import {
  agentEvents,
  agentRuns,
  type AgentEvent,
  type NewAgentEvent,
  type AgentRun,
  type NewAgentRun,
} from '../schema.js';

export const eventRepository = {
  async create(db: DB, data: NewAgentEvent): Promise<AgentEvent> {
    const [row] = await db.insert(agentEvents).values(data).returning();
    return row!;
  },

  async findRecent(db: DB, limit = 50): Promise<AgentEvent[]> {
    return db.select().from(agentEvents)
      .orderBy(desc(agentEvents.createdAt))
      .limit(limit);
  },

  async findById(db: DB, id: string): Promise<AgentEvent | undefined> {
    const result = await db.select().from(agentEvents).where(eq(agentEvents.id, id)).limit(1);
    return result[0];
  },

  async findByDedupeKey(db: DB, key: string): Promise<AgentEvent | undefined> {
    const result = await db.select().from(agentEvents).where(eq(agentEvents.dedupeKey, key)).limit(1);
    return result[0];
  },

  async pending(db: DB, limit = 100): Promise<AgentEvent[]> {
    return db.select().from(agentEvents)
      .where(eq(agentEvents.status, 'pending'))
      .orderBy(agentEvents.createdAt)
      .limit(limit);
  },

  async markProcessed(db: DB, id: string): Promise<void> {
    await db.update(agentEvents)
      .set({ status: 'completed', processedAt: new Date() })
      .where(eq(agentEvents.id, id));
  },

  async markFailed(db: DB, id: string): Promise<void> {
    await db.update(agentEvents)
      .set({ status: 'failed', processedAt: new Date() })
      .where(eq(agentEvents.id, id));
  },

  async enqueueIfNotDuplicate(db: DB, data: NewAgentEvent): Promise<{ event: AgentEvent; isNew: boolean }> {
    if (data.dedupeKey) {
      const existing = await this.findByDedupeKey(db, data.dedupeKey);
      if (existing) return { event: existing, isNew: false };
    }
    const event = await this.create(db, { ...data, status: 'pending' });
    return { event, isNew: true };
  },
};

export const runRepository = {
  async create(db: DB, data: NewAgentRun): Promise<AgentRun> {
    const [row] = await db.insert(agentRuns).values(data).returning();
    return row!;
  },

  async findById(db: DB, id: string): Promise<AgentRun | undefined> {
    const result = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
    return result[0];
  },

  async findByEventId(db: DB, eventId: string): Promise<AgentRun[]> {
    return db.select().from(agentRuns).where(eq(agentRuns.eventId, eventId));
  },

  async recentByUser(db: DB, userId: number, limit = 20): Promise<AgentRun[]> {
    return db.select().from(agentRuns)
      .where(eq(agentRuns.userId, userId))
      .orderBy(desc(agentRuns.createdAt))
      .limit(limit);
  },

  async updateStatus(
    db: DB,
    id: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    output?: Record<string, unknown>,
    errorCode?: string
  ): Promise<void> {
    await db.update(agentRuns)
      .set({ status, output: output ?? undefined, errorCode: errorCode ?? undefined })
      .where(eq(agentRuns.id, id));
  },
};