// llm/providers/openai.ts — OpenAI GPT-4o provider

import type { z } from 'zod';
import OpenAI from 'openai';
import type { LlmMessage, LlmResponse, LlmUsage } from '../types.js';
import { LlmTimeoutError, LlmRateLimitError, LlmContextLengthError, LlmParseError, LlmError } from '../types.js';
import { BaseLlmProvider } from './base.js';
import { MODEL_CONFIGS } from '../types.js';

const PROVIDER_TIMEOUT = 30_000;

export class OpenAiProvider extends BaseLlmProvider {
  readonly mode = 'openai' as const;
  readonly providerName = 'openai';
  private client: OpenAI;

  constructor(apiKey: string, timeoutMs = PROVIDER_TIMEOUT) {
    super({ apiKey, timeoutMs });
    this.client = new OpenAI({ apiKey, timeout: timeoutMs });
  }

  async complete<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    temperature = 0.3,
    maxTokens?: number
  ): Promise<LlmResponse<T>> {
    const systemMsg = messages.find(m => m.role === 'system');
    const schemaJson = JSON.stringify(schema.describe('response'));
    const structuredSystemInstruction = systemMsg
      ? `${systemMsg.content}\n\nYou must respond with ONLY a valid JSON object matching this schema: ${schemaJson}`
      : `Respond with ONLY a valid JSON object matching this schema: ${schemaJson}`;

    const filteredMessages = messages.filter(m => m.role !== 'system');
    const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: structuredSystemInstruction },
      ...filteredMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: MODEL_CONFIGS['gpt-4o-mini']?.id ?? 'gpt-4o-mini-2024-07-18',
        messages: allMessages,
        temperature,
        max_tokens: maxTokens ?? 4096,
        response_format: { type: 'json_object' },
      });

      const message = response.choices[0]?.message;
      if (!message) throw new LlmError('NO_CONTENT', 'No content returned from OpenAI', false);

      const rawContent = message.content ?? '';
      let parsed: T;
      try {
        const json = JSON.parse(rawContent);
        parsed = schema.parse(json);
      } catch (parseErr) {
        throw new LlmParseError(rawContent, parseErr);
      }

      const usage: LlmUsage = {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      };

      return {
        content: parsed,
        usage,
        model: response.model,
        finishReason: response.choices[0]?.finish_reason as 'stop' | 'length' | 'content_filter' ?? 'stop',
      };
    } catch (err: unknown) {
      if (err instanceof LlmError) throw err;

      if (err instanceof OpenAI.APIError) {
        if (err.status === 429) {
          const retryAfter = err.headers?.['retry-after'];
          throw new LlmRateLimitError(retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined);
        }
        if (err.status === 400 && err.message.includes(' maximum context')) {
          throw new LlmContextLengthError(this.client.baseURL ?? 'unknown', 128000);
        }
        if (err.status === 408 || err.code === 'timeout') {
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
    // Rough estimate: ~4 chars per token for English
    return Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  }
}