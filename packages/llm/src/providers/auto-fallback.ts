// llm/providers/auto-fallback.ts — Auto-select provider with cross-provider fallback

import type { z } from 'zod';
import type { LlmMessage, LlmResponse, FallbackRecord } from '../types.js';
import { LlmError } from '../types.js';
import { BaseLlmProvider } from './base.js';
import { OpenAiProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { mockLlmProvider } from './mock.js';
import { parseJsonOrRecover } from '../parser.js';

export interface AutoProviderConfig {
  primaryMode: 'openai' | 'anthropic';
  openAiKey?: string;
  anthropicKey?: string;
  openAiModel?: string;
  anthropicModel?: string;
  timeoutMs?: number;
}

export class AutoFallbackLlmProvider extends BaseLlmProvider {
  readonly mode = 'auto' as const;
  readonly providerName = 'auto';

  private primaryProvider: BaseLlmProvider;
  private fallbackProvider: BaseLlmProvider;
  private primaryMode: 'openai' | 'anthropic' | 'mock';
  private fallbackMode: 'openai' | 'anthropic' | 'mock';

  constructor(config: AutoProviderConfig) {
    super({ apiKey: 'auto', timeoutMs: config.timeoutMs ?? 30_000 });

    const openAiKey = config.openAiKey ?? process.env.PULO_OPENAI_API_KEY ?? '';
    const anthropicKey = config.anthropicKey ?? process.env.PULO_ANTHROPIC_API_KEY ?? '';
    const openAiConfigured = Boolean(openAiKey) && !openAiKey.startsWith('PLACEHOLDER');
    const anthropicConfigured = Boolean(anthropicKey) && !anthropicKey.startsWith('PLACEHOLDER');

    if (config.primaryMode === 'openai' && openAiConfigured) {
      this.primaryProvider = new OpenAiProvider(openAiKey, config.timeoutMs);
      this.primaryMode = 'openai';
      this.fallbackMode = 'anthropic';
      this.fallbackProvider = anthropicConfigured
        ? new AnthropicProvider(anthropicKey, config.timeoutMs)
        : mockLlmProvider;
    } else if (config.primaryMode === 'anthropic' && anthropicConfigured) {
      this.primaryProvider = new AnthropicProvider(anthropicKey, config.timeoutMs);
      this.primaryMode = 'anthropic';
      this.fallbackMode = 'openai';
      this.fallbackProvider = openAiConfigured
        ? new OpenAiProvider(openAiKey, config.timeoutMs)
        : mockLlmProvider;
    } else if (openAiConfigured) {
      this.primaryProvider = new OpenAiProvider(openAiKey, config.timeoutMs);
      this.primaryMode = 'openai';
      this.fallbackMode = 'anthropic';
      this.fallbackProvider = anthropicConfigured
        ? new AnthropicProvider(anthropicKey, config.timeoutMs)
        : mockLlmProvider;
    } else if (anthropicConfigured) {
      this.primaryProvider = new AnthropicProvider(anthropicKey, config.timeoutMs);
      this.primaryMode = 'anthropic';
      this.fallbackMode = 'openai';
      this.fallbackProvider = mockLlmProvider;
    } else {
      // Neither key available — use mock
      this.primaryProvider = mockLlmProvider;
      this.fallbackProvider = mockLlmProvider;
      this.primaryMode = 'mock';
      this.fallbackMode = 'mock';
    }
  }

  async complete<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    temperature = 0.3,
    maxTokens?: number
  ): Promise<LlmResponse<T>> {
    const fallbackHistory: FallbackRecord[] = [];

    // Attempt primary
    try {
      const response = await this.primaryProvider.complete(messages, schema, temperature, maxTokens);
      return {
        ...response,
        provider: this.primaryMode,
      } as LlmResponse<T> & { fallbackHistory: FallbackRecord[] };
    } catch (primaryErr: unknown) {
      // Only fallback for retryable errors or API errors
      if (!this.isRetryableError(primaryErr)) {
        throw primaryErr;
      }

      const fallbackRecord = this.buildFallbackRecord(primaryErr, this.primaryMode);
      fallbackHistory.push(fallbackRecord);

      // Attempt fallback
      try {
        const fallbackResponse = await this.fallbackProvider.complete(messages, schema, temperature, maxTokens);
        return {
          ...fallbackResponse,
          provider: this.fallbackMode,
          fallbackHistory,
        } as LlmResponse<T> & { fallbackHistory: FallbackRecord[] };
      } catch (fallbackErr: unknown) {
        const fbRecord = this.buildFallbackRecord(fallbackErr, this.fallbackMode);
        fallbackHistory.push(fbRecord);

        // Both failed — return structured error with full history
        const errorMessage = this.formatErrorMessage(primaryErr, fallbackErr);
        const error = new LlmError(
          'ALL_PROVIDERS_FAILED',
          errorMessage,
          false,
          undefined
        );
        throw error;
      }
    }
  }

  private isRetryableError(err: unknown): boolean {
    if (err instanceof LlmError) return err.retryable;
    if (err instanceof Error) {
      if (err.message.includes('timeout') || err.message.includes('rate limit')) return true;
    }
    return false;
  }

  private buildFallbackRecord(err: unknown, provider: string): FallbackRecord {
    let errorCode = 'UNKNOWN';
    let errorMessage = String(err);
    if (err instanceof LlmError) {
      errorCode = err.code;
      errorMessage = err.message;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    return {
      attemptedProvider: provider,
      attemptedModel: 'unknown',
      errorCode,
      errorMessage,
      recovered: false,
    };
  }

  private formatErrorMessage(primaryErr: unknown, fallbackErr: unknown): string {
    const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
    return `Primary (${this.primaryMode}) failed: ${primaryMsg}; Fallback (${this.fallbackMode}) also failed: ${fallbackMsg}`;
  }

  estimateTokens(messages: LlmMessage[]): number {
    return Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  }

  override isConfigured(): boolean {
    // Auto provider is always "configured" — it will use mock fallback if no keys
    return true;
  }

  getPrimaryMode(): 'openai' | 'anthropic' | 'mock' {
    return this.primaryMode;
  }

  getFallbackMode(): 'openai' | 'anthropic' | 'mock' {
    return this.fallbackMode;
  }
}