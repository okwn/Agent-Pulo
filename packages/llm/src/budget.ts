// llm/src/budget.ts — Token budget guard and cost estimator with in-memory storage

import type { LlmMessage, TokenBudgetResult, CostAccumulator } from './types.js';
import { MODEL_CONFIGS } from './types.js';
import { LlmContextLengthError } from './types.js';

// Re-export Redis storage from separate file (lazy-loaded to avoid hard dependency)
export { RedisBudgetStorage } from './budget-redis.js';

// ─── Cost Estimator ───────────────────────────────────────────────────────────

export function estimateRequestCost(
  messages: LlmMessage[],
  modelKey: string,
  estimatedOutputTokens = 500
): { inputTokens: number; outputTokens: number; costUsd: number } {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) return { inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const inputTokens = Math.ceil(messages.reduce((a, m) => a + m.content.length, 0) / 4);
  const costUsd = (inputTokens / 1_000_000) * config.costPerMillionInputTokens
    + (estimatedOutputTokens / 1_000_000) * config.costPerMillionOutputTokens;

  return { inputTokens, outputTokens: estimatedOutputTokens, costUsd };
}

// ─── Storage Interface ────────────────────────────────────────────────────────

export interface BudgetStorage {
  getDailyUsage(userId: number): Promise<CostAccumulator | null>;
  setDailyUsage(userId: number, usage: CostAccumulator): Promise<void>;
  incrDailyUsage(userId: number, inputTokens: number, outputTokens: number, costUsd: number): Promise<void>;
  getGlobalDailyUsage(): Promise<CostAccumulator | null>;
  setGlobalDailyUsage(usage: CostAccumulator): Promise<void>;
  incrGlobalDailyUsage(inputTokens: number, outputTokens: number, costUsd: number): Promise<void>;
}

// ─── In-Memory Storage (for tests / dev) ─────────────────────────────────────

interface MemEntry {
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  date: string;
}

export class InMemoryBudgetStorage implements BudgetStorage {
  private userBudgets = new Map<number, MemEntry>();
  private globalBudget: MemEntry = { inputTokens: 0, outputTokens: 0, totalCostUsd: 0, date: todayStr() };

  async getDailyUsage(userId: number): Promise<CostAccumulator | null> {
    const entry = this.userBudgets.get(userId);
    if (!entry || entry.date !== todayStr()) return null;
    return { totalInputTokens: entry.inputTokens, totalOutputTokens: entry.outputTokens, totalCostUsd: entry.totalCostUsd, date: entry.date };
  }

  async setDailyUsage(userId: number, usage: CostAccumulator): Promise<void> {
    this.userBudgets.set(userId, { inputTokens: usage.totalInputTokens, outputTokens: usage.totalOutputTokens, totalCostUsd: usage.totalCostUsd, date: todayStr() });
  }

  async incrDailyUsage(userId: number, inputTokens: number, outputTokens: number, costUsd: number): Promise<void> {
    const today = todayStr();
    const existing = this.userBudgets.get(userId);
    if (!existing || existing.date !== today) {
      this.userBudgets.set(userId, { inputTokens, outputTokens, totalCostUsd: costUsd, date: today });
    } else {
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.totalCostUsd += costUsd;
    }
  }

  async getGlobalDailyUsage(): Promise<CostAccumulator | null> {
    if (this.globalBudget.date !== todayStr()) return null;
    return { totalInputTokens: this.globalBudget.inputTokens, totalOutputTokens: this.globalBudget.outputTokens, totalCostUsd: this.globalBudget.totalCostUsd, date: this.globalBudget.date };
  }

  async setGlobalDailyUsage(usage: CostAccumulator): Promise<void> {
    this.globalBudget = { inputTokens: usage.totalInputTokens, outputTokens: usage.totalOutputTokens, totalCostUsd: usage.totalCostUsd, date: todayStr() };
  }

  async incrGlobalDailyUsage(inputTokens: number, outputTokens: number, costUsd: number): Promise<void> {
    const today = todayStr();
    if (this.globalBudget.date !== today) {
      this.globalBudget = { inputTokens, outputTokens, totalCostUsd: costUsd, date: today };
    } else {
      this.globalBudget.inputTokens += inputTokens;
      this.globalBudget.outputTokens += outputTokens;
      this.globalBudget.totalCostUsd += costUsd;
    }
  }
}

// ─── Token Budget Guard ───────────────────────────────────────────────────────

export interface BudgetGuardConfig {
  dailyLimitUsd: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  storage?: BudgetStorage;
  globalDailyLimitUsd?: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export class TokenBudgetGuard {
  private config: {
    dailyLimitUsd: number;
    maxInputTokens: number;
    maxOutputTokens: number;
    storage?: BudgetStorage;
    globalDailyLimitUsd?: number;
  };

  constructor(config: BudgetGuardConfig) {
    this.config = {
      dailyLimitUsd: config.dailyLimitUsd,
      maxInputTokens: config.maxInputTokens,
      maxOutputTokens: config.maxOutputTokens,
      storage: config.storage,
      globalDailyLimitUsd: config.globalDailyLimitUsd ?? config.dailyLimitUsd,
    };
  }

  checkRequest(messages: LlmMessage[], modelKey: string, estimatedOutputTokens = 500): TokenBudgetResult {
    const { inputTokens, outputTokens, costUsd } = estimateRequestCost(messages, modelKey, estimatedOutputTokens);

    const modelConfig = MODEL_CONFIGS[modelKey];
    const maxInput = modelConfig?.maxInputTokens ?? this.config.maxInputTokens;
    if (inputTokens > maxInput) {
      return { allowed: false, estimatedInputTokens: inputTokens, estimatedOutputTokens: outputTokens, estimatedCostUsd: costUsd, reason: `Input tokens ${inputTokens} exceed limit ${maxInput}` };
    }
    if (estimatedOutputTokens > this.config.maxOutputTokens) {
      return { allowed: false, estimatedInputTokens: inputTokens, estimatedOutputTokens: outputTokens, estimatedCostUsd: costUsd, reason: `Output tokens ${estimatedOutputTokens} exceed limit ${this.config.maxOutputTokens}` };
    }

    return { allowed: true, estimatedInputTokens: inputTokens, estimatedOutputTokens: outputTokens, estimatedCostUsd: costUsd };
  }

  enforceOrThrow(messages: LlmMessage[], modelKey: string, estimatedOutputTokens = 500): void {
    const result = this.checkRequest(messages, modelKey, estimatedOutputTokens);
    if (!result.allowed) {
      if (result.reason?.includes('exceed limit')) {
        const modelConfig = MODEL_CONFIGS[modelKey];
        throw new LlmContextLengthError(modelKey, modelConfig?.maxInputTokens ?? this.config.maxInputTokens);
      }
      throw new Error(`Budget check failed: ${result.reason}`);
    }
  }

  async checkUserBudget(userId: number, estimatedCostUsd: number): Promise<{ allowed: boolean; reason?: string; remainingUsd: number }> {
    const storage = this.config.storage;
    if (!storage) {
      return { allowed: true, remainingUsd: this.config.dailyLimitUsd };
    }
    const usage = await storage.getDailyUsage(userId);
    const remaining = this.config.dailyLimitUsd - (usage?.totalCostUsd ?? 0);
    if (remaining < estimatedCostUsd) {
      return { allowed: false, reason: `User daily budget exceeded`, remainingUsd: remaining };
    }
    return { allowed: true, remainingUsd: remaining };
  }

  async recordUsage(inputTokens: number, outputTokens: number, costUsd: number, userId?: number): Promise<void> {
    const storage = this.config.storage;
    if (storage) {
      if (userId !== undefined) {
        await storage.incrDailyUsage(userId, inputTokens, outputTokens, costUsd);
      }
      await storage.incrGlobalDailyUsage(inputTokens, outputTokens, costUsd);
    }
  }

  async getDailyCost(): Promise<number> {
    const storage = this.config.storage;
    if (storage) {
      const usage = await storage.getGlobalDailyUsage();
      return usage?.totalCostUsd ?? 0;
    }
    return 0;
  }

  getRemainingBudget(): number {
    return this.config.dailyLimitUsd;
  }
}

// ─── Module-level accumulators (in-memory fallback) ───────────────────────────

let _dailyAccumulator: CostAccumulator = { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, date: todayStr() };

export function getDailyAccumulator(): CostAccumulator {
  const today = todayStr();
  if (_dailyAccumulator.date !== today) {
    _dailyAccumulator = { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, date: today };
  }
  return { ..._dailyAccumulator };
}

export function addToDailyCost(inputTokens: number, outputTokens: number, costUsd: number): void {
  const today = todayStr();
  if (_dailyAccumulator.date !== today) {
    _dailyAccumulator = { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, date: today };
  }
  _dailyAccumulator.totalInputTokens += inputTokens;
  _dailyAccumulator.totalOutputTokens += outputTokens;
  _dailyAccumulator.totalCostUsd += costUsd;
}

export function resetDailyAccumulatorsIfNewDay(): void {
  const today = todayStr();
  if (_dailyAccumulator.date !== today) {
    _dailyAccumulator = { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, date: today };
  }
}

// ─── Storage Factory ───────────────────────────────────────────────────────────

export type BudgetStorageMode = 'memory' | 'redis';

function createStorage(): BudgetStorage | undefined {
  const mode = (process.env.PULO_BUDGET_STORAGE ?? 'memory') as BudgetStorageMode;
  if (mode === 'redis') {
    // Lazy import to avoid hard dependency when not needed
    const { RedisBudgetStorage } = require('./budget-redis.js');
    return new RedisBudgetStorage(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }
  // In mock/local mode, in-memory is fine; return undefined = in-memory accumulators used
  return undefined;
}

// ─── Default budget guard ─────────────────────────────────────────────────────

export function createBudgetGuard(): TokenBudgetGuard {
  const dailyLimit = parseFloat(process.env.PULO_DAILY_LLM_COST_LIMIT_USD ?? '5.0');
  const storage = createStorage();

  if (storage) {
    return new TokenBudgetGuard({
      dailyLimitUsd: dailyLimit,
      maxInputTokens: 128_000,
      maxOutputTokens: 16_384,
      storage,
    });
  }

  return new TokenBudgetGuard({
    dailyLimitUsd: dailyLimit,
    maxInputTokens: 128_000,
    maxOutputTokens: 16_384,
  });
}

export const budgetGuard = createBudgetGuard();