// llm/providers/base.ts — LLM provider interface

import type { z } from 'zod';
import type { LlmMessage, LlmResponse, LlmUsage, LlmMode } from '../types.js';

export interface LlmProviderConfig {
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface LlmProvider {
  readonly mode: LlmMode;
  readonly providerName: string;

  /**
   * Send a chat completion request and parse response as structured JSON.
   * @param messages - Chat messages
   * @param schema - Zod schema to parse the response
   * @param temperature - Temperature 0-2 (default 0.3 for structured output)
   * @param maxTokens - Max output tokens
   */
  complete<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    temperature?: number,
    maxTokens?: number
  ): Promise<LlmResponse<T>>;

  /**
   * Estimate tokens for a message array (approximate).
   */
  estimateTokens(messages: LlmMessage[]): number;

  /**
   * Returns true if the provider is configured with valid credentials.
   */
  isConfigured(): boolean;
}

export abstract class BaseLlmProvider implements LlmProvider {
  abstract readonly mode: LlmMode;
  abstract readonly providerName: string;

  protected apiKey: string;
  protected timeoutMs: number;
  protected maxRetries: number;

  constructor(config: LlmProviderConfig) {
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 2;
  }

  abstract complete<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    temperature?: number,
    maxTokens?: number
  ): Promise<LlmResponse<T>>;

  abstract estimateTokens(messages: LlmMessage[]): number;

  isConfigured(): boolean {
    return Boolean(this.apiKey) && !this.apiKey.startsWith('PLACEHOLDER') && this.apiKey !== 'undefined';
  }
}