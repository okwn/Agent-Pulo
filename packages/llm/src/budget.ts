// llm/src/budget.ts — Token budget guard and cost estimator

import type { LlmMessage, TokenBudgetResult, CostAccumulator } from './types.js';
import { MODEL_CONFIGS, DEFAULT_SMALL_MODEL, DEFAULT_LARGE_MODEL } from './types.js';
import { LlmBudgetExceededError, LlmContextLengthError } from './types.js';

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

// ─── Daily Cost Tracker ───────────────────────────────────────────────────────

let dailyAccumulator: CostAccumulator = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCostUsd: 0,
  date: todayStr(),
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isToday(dateStr: string): boolean {
  return dateStr === todayStr();
}

export function resetDailyAccumulatorsIfNewDay(): void {
  if (!isToday(dailyAccumulator.date)) {
    dailyAccumulator = { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, date: todayStr() };
  }
}

export function getDailyAccumulator(): CostAccumulator {
  resetDailyAccumulatorsIfNewDay();
  return { ...dailyAccumulator };
}

export function addToDailyCost(inputTokens: number, outputTokens: number, costUsd: number): void {
  resetDailyAccumulatorsIfNewDay();
  dailyAccumulator.totalInputTokens += inputTokens;
  dailyAccumulator.totalOutputTokens += outputTokens;
  dailyAccumulator.totalCostUsd += costUsd;
}

// ─── Token Budget Guard ───────────────────────────────────────────────────────

export interface BudgetGuardConfig {
  dailyLimitUsd: number;
  maxInputTokens: number;
  maxOutputTokens: number;
}

export class TokenBudgetGuard {
  private config: BudgetGuardConfig;

  constructor(config: BudgetGuardConfig) {
    this.config = config;
  }

  /**
   * Check if a request fits within token and cost budgets.
   * Throws LlmBudgetExceededError if daily cost budget exceeded.
   * Throws LlmContextLengthError if input exceeds token limit.
   */
  checkRequest(messages: LlmMessage[], modelKey: string, estimatedOutputTokens = 500): TokenBudgetResult {
    const { inputTokens, outputTokens, costUsd } = estimateRequestCost(messages, modelKey, estimatedOutputTokens);

    // Check daily cost budget
    resetDailyAccumulatorsIfNewDay();
    if (dailyAccumulator.totalCostUsd + costUsd > this.config.dailyLimitUsd) {
      return {
        allowed: false,
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCostUsd: costUsd,
        reason: `Daily cost budget exceeded: $${dailyAccumulator.totalCostUsd.toFixed(4)} + $${costUsd.toFixed(4)} > $${this.config.dailyLimitUsd}`,
      };
    }

    // Check input token limit
    const modelConfig = MODEL_CONFIGS[modelKey];
    const maxInput = modelConfig?.maxInputTokens ?? this.config.maxInputTokens;
    if (inputTokens > maxInput) {
      return {
        allowed: false,
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCostUsd: costUsd,
        reason: `Input tokens ${inputTokens} exceed limit ${maxInput}`,
      };
    }

    // Check output token limit
    if (estimatedOutputTokens > this.config.maxOutputTokens) {
      return {
        allowed: false,
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCostUsd: costUsd,
        reason: `Output tokens ${estimatedOutputTokens} exceed limit ${this.config.maxOutputTokens}`,
      };
    }

    return {
      allowed: true,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedCostUsd: costUsd,
    };
  }

  /**
   * Check budget and throw if not allowed.
   */
  enforceOrThrow(messages: LlmMessage[], modelKey: string, estimatedOutputTokens = 500): void {
    const result = this.checkRequest(messages, modelKey, estimatedOutputTokens);
    if (!result.allowed) {
      if (result.reason?.includes('cost') || result.reason?.includes('Daily')) {
        throw new LlmBudgetExceededError(this.config.dailyLimitUsd, dailyAccumulator.totalCostUsd);
      }
      if (result.reason?.includes('exceed limit')) {
        const modelConfig = MODEL_CONFIGS[modelKey];
        throw new LlmContextLengthError(modelKey, modelConfig?.maxInputTokens ?? this.config.maxInputTokens);
      }
      throw new Error(`Budget check failed: ${result.reason}`);
    }
  }

  /**
   * After a successful LLM call, record the actual costs.
   */
  recordUsage(inputTokens: number, outputTokens: number, costUsd: number): void {
    addToDailyCost(inputTokens, outputTokens, costUsd);
  }

  getDailyCost(): number {
    return getDailyAccumulator().totalCostUsd;
  }

  getRemainingBudget(): number {
    return this.config.dailyLimitUsd - getDailyAccumulator().totalCostUsd;
  }
}

// ─── Default budget guard ──────────────────────────────────────────────────────

export function createBudgetGuard(): TokenBudgetGuard {
  const dailyLimit = parseFloat(process.env.PULO_DAILY_LLM_COST_LIMIT_USD ?? '5.0');
  return new TokenBudgetGuard({
    dailyLimitUsd: dailyLimit,
    maxInputTokens: 128_000,
    maxOutputTokens: 16_384,
  });
}

export const budgetGuard = createBudgetGuard();