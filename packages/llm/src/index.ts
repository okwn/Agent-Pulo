// llm/src/index.ts — Public API for @pulo/llm

// Types
export type {
  LlmMode,
  LlmRunType,
  ModelFamily,
  ModelConfig,
  LlmMessage,
  LlmRequest,
  LlmUsage,
  LlmResponse,
  CostAccumulator,
  TokenBudgetResult,
  FallbackRecord,
  LlmResponseWithHistory,
} from './types.js';

export { LLM_MODES } from './types.js';
export { MODEL_CONFIGS, DEFAULT_SMALL_MODEL, DEFAULT_LARGE_MODEL, RUN_TYPE_MODEL_MAP } from './types.js';

// Errors
export {
  LlmError,
  LlmTimeoutError,
  LlmRateLimitError,
  LlmContextLengthError,
  LlmBudgetExceededError,
  LlmParseError,
  isLlmRetryable,
} from './types.js';

// Providers
export { BaseLlmProvider } from './providers/base.js';
export { OpenAiProvider } from './providers/openai.js';
export { AnthropicProvider } from './providers/anthropic.js';
export { MockLlmProvider, mockLlmProvider } from './providers/mock.js';
export { LocalLlmProvider } from './providers/local.js';
export { AutoFallbackLlmProvider } from './providers/auto-fallback.js';

// Router
export { ModelRouter, createRouter, modelRouter } from './router.js';

// Budget
export {
  TokenBudgetGuard,
  createBudgetGuard,
  budgetGuard,
  estimateRequestCost,
  getDailyAccumulator,
  addToDailyCost,
  resetDailyAccumulatorsIfNewDay,
  type BudgetGuardConfig,
  InMemoryBudgetStorage,
  RedisBudgetStorage,
} from './budget.js';

// Retry
export { withRetry, DEFAULT_RETRY_CONFIG, type RetryConfig } from './retry.js';

// Parser
export { parseJsonOrRecover } from './parser.js';

// Prompts
export { loadPrompt, listPromptVersions, getPromptMetadata, type PromptTemplate, type PromptMetadata } from './prompts.js';

// Client
export { LlmClient, createLlmClient, createForMode, type LlmClientConfig, type CreateLlmClientOptions } from './llm.js';