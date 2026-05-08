// llm/src/retry.ts — Retry with exponential backoff

import { LlmRateLimitError, LlmTimeoutError, LlmError } from './types.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
};

function isRetryable(err: unknown): boolean {
  if (err instanceof LlmRateLimitError) return true;
  if (err instanceof LlmTimeoutError) return true;
  if (err instanceof LlmError) return err.retryable;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isRetryable(err)) throw err;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await sleep(delay);
    }
  }
  throw lastError;
}
