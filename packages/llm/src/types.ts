// llm/types.ts — Core types for the LLM provider abstraction layer

import type { z } from 'zod';

// ─── Provider / Mode ─────────────────────────────────────────────────────────

export type LlmMode = 'mock' | 'openai' | 'anthropic' | 'local';

export const LLM_MODES = ['mock', 'openai', 'anthropic', 'local'] as const;

// ─── Model Selection ───────────────────────────────────────────────────────────

export type ModelFamily = 'gpt-4o' | 'gpt-4o-mini' | 'claude-sonnet' | 'claude-haiku' | 'local';

export interface ModelConfig {
  id: string; // full model id e.g. 'gpt-4o-2024-05-13'
  family: ModelFamily;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  costPerMillionInputTokens: number; // USD
  costPerMillionOutputTokens: number; // USD
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'gpt-4o': {
    id: 'gpt-4o-2024-05-13',
    family: 'gpt-4o',
    maxInputTokens: 128_000,
    maxOutputTokens: 16_384,
    supportsStructuredOutput: true,
    supportsVision: true,
    costPerMillionInputTokens: 5.0,
    costPerMillionOutputTokens: 15.0,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini-2024-07-18',
    family: 'gpt-4o-mini',
    maxInputTokens: 128_000,
    maxOutputTokens: 16_384,
    supportsStructuredOutput: true,
    supportsVision: true,
    costPerMillionInputTokens: 0.15,
    costPerMillionOutputTokens: 0.60,
  },
  'claude-sonnet': {
    id: 'claude-sonnet-4-20250514',
    family: 'claude-sonnet',
    maxInputTokens: 200_000,
    maxOutputTokens: 8_192,
    supportsStructuredOutput: true,
    supportsVision: true,
    costPerMillionInputTokens: 3.0,
    costPerMillionOutputTokens: 15.0,
  },
  'claude-haiku': {
    id: 'claude-haiku-4-20250514',
    family: 'claude-haiku',
    maxInputTokens: 200_000,
    maxOutputTokens: 4_096,
    supportsStructuredOutput: true,
    supportsVision: true,
    costPerMillionInputTokens: 0.25,
    costPerMillionOutputTokens: 1.25,
  },
};

export const DEFAULT_SMALL_MODEL = 'gpt-4o-mini';
export const DEFAULT_LARGE_MODEL = 'gpt-4o';

// ─── Run Type → Model Mapping ─────────────────────────────────────────────────

export type LlmRunType =
  | 'intent_classification'
  | 'farcaster_reply'
  | 'cast_summary'
  | 'thread_summary'
  | 'truth_check_claim_extraction'
  | 'truth_check_verdict'
  | 'trend_cluster_summary'
  | 'risk_analysis'
  | 'alert_message'
  | 'admin_summary'
  | 'reply_suggestion'
  | 'cast_rewrite';

// Map run types to model tiers
export const RUN_TYPE_MODEL_MAP: Record<LlmRunType, 'small' | 'large'> = {
  intent_classification: 'small',
  farcaster_reply: 'large',
  cast_summary: 'small',
  thread_summary: 'large',
  truth_check_claim_extraction: 'small',
  truth_check_verdict: 'large',
  trend_cluster_summary: 'small',
  risk_analysis: 'large',
  alert_message: 'small',
  admin_summary: 'small',
  reply_suggestion: 'small',
  cast_rewrite: 'large',
};

// ─── LLM Request / Response ───────────────────────────────────────────────────

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: z.ZodType;
  timeoutMs?: number;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LlmResponse<T> {
  content: T;
  usage: LlmUsage;
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
}

// ─── Cost Tracking ─────────────────────────────────────────────────────────────

export interface CostAccumulator {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  date: string; // YYYY-MM-DD
}

// ─── Token Budget ──────────────────────────────────────────────────────────────

export interface TokenBudgetResult {
  allowed: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  reason?: string;
}

// ─── Error Types ───────────────────────────────────────────────────────────────

export class LlmError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly statusCode?: number;
  constructor(code: string, message: string, retryable = false, statusCode?: number) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

export class LlmTimeoutError extends LlmError {
  constructor(timeoutMs: number) {
    super('TIMEOUT', `LLM request timed out after ${timeoutMs}ms`, true);
    this.name = 'LlmTimeoutError';
  }
}

export class LlmRateLimitError extends LlmError {
  readonly retryAfterMs?: number;
  constructor(retryAfterMs?: number) {
    super('RATE_LIMIT', 'LLM provider rate limit hit', true);
    this.name = 'LlmRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class LlmContextLengthError extends LlmError {
  constructor(model: string, contextLimit: number) {
    super('CONTEXT_LENGTH', `Input exceeds ${contextLimit} tokens for model ${model}`, false);
    this.name = 'LlmContextLengthError';
  }
}

export class LlmBudgetExceededError extends LlmError {
  constructor(dailyLimitUsd: number, currentCostUsd: number) {
    super('BUDGET_EXCEEDED', `Daily LLM budget of $${dailyLimitUsd} exceeded (current: $${currentCostUsd.toFixed(4)})`, false);
    this.name = 'LlmBudgetExceededError';
  }
}

export class LlmParseError extends LlmError {
  constructor(rawOutput: string, cause: unknown) {
    super('PARSE_ERROR', `Failed to parse LLM output as JSON`, false);
    this.name = 'LlmParseError';
  }
}

export function isLlmRetryable(err: LlmError): boolean {
  return err.retryable;
}