// llm/src/llm.ts — Main LLM client tying together provider + router + budget + retry

import type { z } from 'zod';
import type { LlmMessage, LlmResponse, LlmMode } from './types.js';
import { MODEL_CONFIGS } from './types.js';
import { LlmBudgetExceededError } from './types.js';
import { ModelRouter, createRouter } from './router.js';
import { TokenBudgetGuard, createBudgetGuard } from './budget.js';
import { withRetry, DEFAULT_RETRY_CONFIG, type RetryConfig } from './retry.js';
import { BaseLlmProvider } from './providers/base.js';
import { OpenAiProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { LocalLlmProvider } from './providers/local.js';
import { mockLlmProvider } from './providers/mock.js';
import { AutoFallbackLlmProvider } from './providers/auto-fallback.js';

export interface LlmClientConfig {
  provider: BaseLlmProvider;
  router: ModelRouter;
  budgetGuard: TokenBudgetGuard;
  retryConfig?: Partial<RetryConfig>;
}

export class LlmClient {
  private provider: BaseLlmProvider;
  private router: ModelRouter;
  private budgetGuard: TokenBudgetGuard;
  private retryConfig: Partial<RetryConfig>;

  constructor(config: LlmClientConfig) {
    this.provider = config.provider;
    this.router = config.router;
    this.budgetGuard = config.budgetGuard;
    this.retryConfig = config.retryConfig ?? {};
  }

  /**
   * Generate a completion, automatically selecting the right model for the run type.
   */
  async complete<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    runType: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<LlmResponse<T>> {
    const modelKey = this.router.modelForRunType(runType as Parameters<typeof this.router.modelForRunType>[0]);
    const estimatedOutput = options.maxTokens ?? 500;

    // Budget check — throws if not allowed
    this.budgetGuard.enforceOrThrow(messages, modelKey, estimatedOutput);

    const response = await withRetry(
      () => this.provider.complete(messages, schema, options.temperature ?? 0.3, options.maxTokens),
      this.retryConfig
    );

    // Record actual usage
    this.budgetGuard.recordUsage(
      response.usage.inputTokens,
      response.usage.outputTokens,
      this.estimateCost(response.usage.inputTokens, response.usage.outputTokens, modelKey)
    );

    return response;
  }

  private estimateCost(inputTokens: number, outputTokens: number, modelKey: string): number {
    const config = MODEL_CONFIGS[modelKey];
    if (!config) return 0;
    return (inputTokens / 1_000_000) * config.costPerMillionInputTokens
      + (outputTokens / 1_000_000) * config.costPerMillionOutputTokens;
  }

  getRouter(): ModelRouter {
    return this.router;
  }

  getBudgetGuard(): TokenBudgetGuard {
    return this.budgetGuard;
  }

  getMode(): LlmMode {
    return this.router.getMode();
  }
}

export interface CreateLlmClientOptions {
  mode?: LlmMode;
  provider?: BaseLlmProvider;
  retryConfig?: Partial<RetryConfig>;
}

export function createLlmClient(options: CreateLlmClientOptions = {}): LlmClient {
  const mode = options.mode ?? (process.env.PULO_LLM_MODE as LlmMode) ?? 'mock';
  const router = createRouter();
  const budgetGuard = createBudgetGuard();

  let provider: BaseLlmProvider;
  if (options.provider) {
    provider = options.provider;
  } else {
    provider = mockLlmProvider; // default — will be replaced by createForMode
  }

  return new LlmClient({ provider, router, budgetGuard });
}

export function createForMode(mode: LlmMode): LlmClient {
  const router = new ModelRouter({
    mode,
    smallModel: process.env.PULO_DEFAULT_SMALL_MODEL as string | undefined,
    largeModel: process.env.PULO_DEFAULT_LARGE_MODEL as string | undefined,
  });
  const budgetGuard = createBudgetGuard();

  let provider: BaseLlmProvider;
  switch (mode) {
    case 'openai':
      provider = new OpenAiProvider(process.env.PULO_OPENAI_API_KEY ?? '');
      break;
    case 'anthropic':
      provider = new AnthropicProvider(process.env.PULO_ANTHROPIC_API_KEY ?? '');
      break;
    case 'local':
      provider = new LocalLlmProvider(process.env.PULO_LOCAL_LLM_URL ?? '');
      break;
    case 'auto':
      provider = new AutoFallbackLlmProvider({
        primaryMode: (process.env.PULO_AUTO_PRIMARY ?? 'openai') as 'openai' | 'anthropic',
        openAiKey: process.env.PULO_OPENAI_API_KEY,
        anthropicKey: process.env.PULO_ANTHROPIC_API_KEY,
        openAiModel: process.env.PULO_DEFAULT_SMALL_MODEL,
        anthropicModel: process.env.PULO_DEFAULT_LARGE_MODEL,
      });
      break;
    default:
      provider = mockLlmProvider;
  }

  return new LlmClient({ provider, router, budgetGuard });
}
