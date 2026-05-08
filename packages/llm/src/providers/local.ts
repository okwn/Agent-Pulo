// llm/providers/local.ts — Placeholder for local/self-hosted LLM provider

import type { z } from 'zod';
import type { LlmMessage, LlmResponse, LlmUsage } from '../types.js';
import { LlmError } from '../types.js';
import { BaseLlmProvider } from './base.js';

export class LocalLlmProvider extends BaseLlmProvider {
  readonly mode = 'local' as const;
  readonly providerName = 'local';

  private baseUrl: string;

  constructor(baseUrl: string, apiKey = 'local') {
    super({ apiKey });
    this.baseUrl = baseUrl;
  }

  async complete<T>(
    _messages: LlmMessage[],
    _schema: z.ZodType<T>,
    _temperature = 0.3,
    _maxTokens?: number
  ): Promise<LlmResponse<T>> {
    throw new LlmError('NOT_IMPLEMENTED', 'Local LLM provider not yet implemented', false);
  }

  estimateTokens(messages: LlmMessage[]): number {
    return Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  }

  override isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }
}