// llm/src/budget-redis.ts — Redis budget storage (separate to avoid top-level ioredis import)

import type { CostAccumulator } from './types.js';
import type { BudgetStorage } from './budget.js';

interface MemEntry {
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  date: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export class RedisBudgetStorage implements BudgetStorage {
  private redisUrl: string;
  private ttlSeconds = 86400;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _redis: any = null;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  private key(userId?: number): string {
    const today = todayStr();
    if (userId !== undefined) return `llm:budget:${today}:user:${userId}`;
    return `llm:budget:${today}:global`;
  }

  async init(): Promise<void> {
    if (this._redis) return;
    try {
      const { default: Redis } = await import('ioredis');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._redis = new (Redis as any)(this.redisUrl, { lazyConnect: true });
      await this._redis.connect();
    } catch {
      this._redis = null;
    }
  }

  private async getEntry(key: string): Promise<MemEntry | null> {
    await this.init();
    if (!this._redis) return null;
    try {
      const data = await this._redis.get(key);
      if (!data) return null;
      const parsed = JSON.parse(data) as MemEntry;
      if (parsed.date !== todayStr()) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async setEntry(key: string, entry: MemEntry): Promise<void> {
    await this.init();
    if (!this._redis) return;
    try {
      await this._redis.setex(key, this.ttlSeconds, JSON.stringify(entry));
    } catch {
      // Redis unavailable
    }
  }

  private async incrEntry(key: string, inputTokens: number, outputTokens: number, costUsd: number): Promise<void> {
    await this.init();
    if (!this._redis) return;
    try {
      const today = todayStr();
      const existing = await this.getEntry(key);
      const entry: MemEntry = existing && existing.date === today
        ? { date: today, inputTokens: existing.inputTokens + inputTokens, outputTokens: existing.outputTokens + outputTokens, totalCostUsd: existing.totalCostUsd + costUsd }
        : { date: today, inputTokens, outputTokens, totalCostUsd: costUsd };
      await this._redis.setex(key, this.ttlSeconds, JSON.stringify(entry));
    } catch {
      // Redis unavailable
    }
  }

  async getDailyUsage(userId: number): Promise<CostAccumulator | null> {
    const entry = await this.getEntry(this.key(userId));
    if (!entry) return null;
    return { totalInputTokens: entry.inputTokens, totalOutputTokens: entry.outputTokens, totalCostUsd: entry.totalCostUsd, date: entry.date };
  }

  async setDailyUsage(userId: number, usage: CostAccumulator): Promise<void> {
    await this.setEntry(this.key(userId), { date: todayStr(), inputTokens: usage.totalInputTokens, outputTokens: usage.totalOutputTokens, totalCostUsd: usage.totalCostUsd });
  }

  async incrDailyUsage(userId: number, inputTokens: number, outputTokens: number, costUsd: number): Promise<void> {
    await this.incrEntry(this.key(userId), inputTokens, outputTokens, costUsd);
  }

  async getGlobalDailyUsage(): Promise<CostAccumulator | null> {
    const entry = await this.getEntry(this.key());
    if (!entry) return null;
    return { totalInputTokens: entry.inputTokens, totalOutputTokens: entry.outputTokens, totalCostUsd: entry.totalCostUsd, date: entry.date };
  }

  async setGlobalDailyUsage(usage: CostAccumulator): Promise<void> {
    await this.setEntry(this.key(), { date: todayStr(), inputTokens: usage.totalInputTokens, outputTokens: usage.totalOutputTokens, totalCostUsd: usage.totalCostUsd });
  }

  async incrGlobalDailyUsage(inputTokens: number, outputTokens: number, costUsd: number): Promise<void> {
    await this.incrEntry(this.key(), inputTokens, outputTokens, costUsd);
  }
}