// llm/providers/anthropic.ts — Anthropic Claude provider

import type { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { LlmMessage, LlmResponse, LlmUsage } from '../types.js';
import { LlmTimeoutError, LlmRateLimitError, LlmContextLengthError, LlmParseError, LlmError } from '../types.js';
import { BaseLlmProvider } from './base.js';
import { MODEL_CONFIGS } from '../types.js';

const PROVIDER_TIMEOUT = 30_000;

export class AnthropicProvider extends BaseLlmProvider {
  readonly mode = 'anthropic' as const;
  readonly providerName = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string, timeoutMs = PROVIDER_TIMEOUT) {
    super({ apiKey, timeoutMs });
    this.client = new Anthropic({ apiKey, timeout: timeoutMs });
  }

  async complete<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    temperature = 0.3,
    maxTokens?: number
  ): Promise<LlmResponse<T>> {
    const systemMsg = messages.find(m => m.role === 'system');
    const filteredMessages = messages.filter(m => m.role !== 'system');

    const schemaJson = JSON.stringify(schema.describe('response'));
    const systemInstruction = systemMsg
      ? `${systemMsg.content}\n\nYou must respond with ONLY a valid JSON object matching this schema: ${schemaJson}`
      : `Respond with ONLY a valid JSON object matching this schema: ${schemaJson}`;

    try {
      const response = await this.client.messages.create({
        model: MODEL_CONFIGS['claude-haiku']?.id ?? 'claude-haiku-4-20250514',
        max_tokens: maxTokens ?? 4096,
        temperature,
        system: systemInstruction,
        messages: filteredMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

      let parsed: T;
      try {
        const json = JSON.parse(text);
        parsed = schema.parse(json);
      } catch (parseErr) {
        throw new LlmParseError(text, parseErr);
      }

      const usage: LlmUsage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      return {
        content: parsed,
        usage,
        model: response.model,
        finishReason: 'stop',
      };
    } catch (err: unknown) {
      if (err instanceof LlmError) throw err;

      if (err instanceof Anthropic.APIError) {
        if (err.status === 429) {
          const retryAfter = err.headers?.['retry-after'];
          throw new LlmRateLimitError(retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined);
        }
        if (err.status === 400 && err.message.includes('maximum tokens')) {
          throw new LlmContextLengthError(this.client.baseURL ?? 'unknown', 200_000);
        }
        if (err.status === 408) {
          throw new LlmTimeoutError(this.timeoutMs);
        }
        throw new LlmError('API_ERROR', err.message, err.status ? err.status >= 500 : false, err.status);
      }

      if (err instanceof Error && err.message.includes('timeout')) {
        throw new LlmTimeoutError(this.timeoutMs);
      }

      throw err;
    }
  }

  estimateTokens(messages: LlmMessage[]): number {
    return Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  }
}