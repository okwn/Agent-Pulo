// llm/src/index.test.ts — Tests for the LLM package

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  mockLlmProvider,
  MockLlmProvider,
  LlmParseError,
  estimateRequestCost,
  resetDailyAccumulatorsIfNewDay,
  createBudgetGuard,
  TokenBudgetGuard,
  withRetry,
  parseJsonOrRecover,
  MODEL_CONFIGS,
} from './index.js';

describe('MockLlmProvider', () => {
  let provider: MockLlmProvider;

  beforeEach(() => {
    provider = new MockLlmProvider();
    provider.clearHistory();
  });

  it('returns intent classification using mock routing', async () => {
    // Use a message that matches intent_classification via findMockKey
    provider.setMockResponse('intent_classification', {
      category: 'mention_reply',
      runType: 'mention_reply',
      confidence: 0.85,
      reasoning: 'mock',
      suggestedTone: 'friendly',
      requiresBackgroundContext: false,
    });
    const schema = z.object({
      category: z.string(),
      runType: z.string(),
      confidence: z.number(),
      reasoning: z.string(),
      suggestedTone: z.string(),
      requiresBackgroundContext: z.boolean(),
    });
    const messages = [{ role: 'user' as const, content: 'classify this intent' }];
    const response = await provider.complete(messages, schema);
    expect(response.content.category).toBe('mention_reply');
  });

  it('returns truth check verdict for fact-check query', async () => {
    const schema = z.object({
      verdict: z.string(),
      confidence: z.number(),
      shortAnswer: z.string(),
      dashboardExplanation: z.string(),
      supportingSignals: z.array(z.string()),
      contradictingSignals: z.array(z.string()),
      evidenceCastHashes: z.array(z.string()),
      sourcesChecked: z.array(z.string()),
    });
    const messages = [{ role: 'user' as const, content: 'True or false: Ethereum switched to proof-of-stake' }];
    const response = await provider.complete(messages, schema);
    expect(response.content.verdict).toBe('likely_true');
    expect(typeof response.content.shortAnswer).toBe('string');
  });

  it('returns alert message structure via mock', async () => {
    // Use setMockResponse to ensure alert_message is returned
    provider.setMockResponse('alert_message', {
      alertType: 'airdrop',
      title: 'New Airdrop',
      message: 'Active airdrop detected',
      priority: 'medium',
    });
    const schema = z.object({
      alertType: z.string(),
      title: z.string(),
      message: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      actionRequired: z.boolean().optional(),
      actionSuggestion: z.string().optional(),
    });
    const messages = [{ role: 'user' as const, content: 'alert test' }];
    const response = await provider.complete(messages, schema);
    expect(response.content.alertType).toBe('airdrop');
  });

  it('records call history', async () => {
    const schema = z.object({ text: z.string().optional() });
    const messages = [{ role: 'user' as const, content: 'hello' }];
    await provider.complete(messages, schema);
    expect(provider.getCallHistory()).toHaveLength(1);
  });

  it('clears history', async () => {
    const schema = z.object({ text: z.string().optional() });
    const messages = [{ role: 'user' as const, content: 'hello' }];
    await provider.complete(messages, schema);
    provider.clearHistory();
    expect(provider.getCallHistory()).toHaveLength(0);
  });
});

describe('parseJsonOrRecover', () => {
  it('parses valid JSON directly', () => {
    const schema = z.object({ text: z.string(), count: z.number() });
    const result = parseJsonOrRecover('{"text":"hello","count":42}', schema);
    expect(result.parsed.text).toBe('hello');
    expect(result.parsed.count).toBe(42);
    expect(result.recovered).toBe(false);
  });

  it('recovers from JSON wrapped in markdown code block', () => {
    const schema = z.object({ text: z.string(), count: z.number() });
    const result = parseJsonOrRecover('```json\n{"text":"hello","count":42}\n```', schema);
    expect(result.parsed.text).toBe('hello');
    expect(result.recovered).toBe(true);
  });

  it('recovers from JSON with trailing comma', () => {
    const schema = z.object({ text: z.string() });
    const result = parseJsonOrRecover('{"text":"hello",}', schema);
    expect(result.parsed.text).toBe('hello');
    expect(result.recovered).toBe(true);
  });

  it('throws LlmParseError for unfixable input', () => {
    const schema = z.object({ text: z.string() });
    expect(() => parseJsonOrRecover('not json at all', schema)).toThrow(LlmParseError);
  });
});

describe('estimateRequestCost', () => {
  it('calculates cost for gpt-4o-mini', () => {
    const messages = [{ role: 'user' as const, content: 'test message' }];
    const result = estimateRequestCost(messages, 'gpt-4o-mini', 100);
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBe(100);
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it('returns zero for unknown model', () => {
    const messages = [{ role: 'user' as const, content: 'test' }];
    const result = estimateRequestCost(messages, 'unknown-model', 100);
    expect(result.inputTokens).toBe(0);
    expect(result.costUsd).toBe(0);
  });
});

describe('TokenBudgetGuard', () => {
  let guard: TokenBudgetGuard;

  beforeEach(() => {
    resetDailyAccumulatorsIfNewDay();
    guard = createBudgetGuard();
  });

  it('allows small requests within budget', () => {
    const messages = [{ role: 'user' as const, content: 'hi' }];
    const result = guard.checkRequest(messages, 'gpt-4o-mini', 100);
    expect(result.allowed).toBe(true);
  });

  it('rejects input exceeding token limit', () => {
    const longMessage = { role: 'user' as const, content: 'x'.repeat(600_000) };
    const result = guard.checkRequest([longMessage], 'gpt-4o-mini', 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceed limit');
  });

  it('rejects output exceeding limit', () => {
    const messages = [{ role: 'user' as const, content: 'hi' }];
    const result = guard.checkRequest(messages, 'gpt-4o-mini', 200_000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Output tokens');
  });

  it('enforceOrThrow throws for budget exceeded', () => {
    const guard = new TokenBudgetGuard({ dailyLimitUsd: 0.0001, maxInputTokens: 128_000, maxOutputTokens: 16_384 });
    const messages = [{ role: 'user' as const, content: 'some content' }];
    expect(() => guard.enforceOrThrow(messages, 'gpt-4o-mini', 500)).toThrow();
  });

  it('records usage correctly', () => {
    guard.recordUsage(100, 50, 0.001);
    expect(guard.getDailyCost()).toBeCloseTo(0.001, 3);
  });

  it('calculates remaining budget', () => {
    const dailyLimit = 5.0;
    guard = new TokenBudgetGuard({ dailyLimitUsd: dailyLimit, maxInputTokens: 128_000, maxOutputTokens: 16_384 });
    const remaining = guard.getRemainingBudget();
    expect(remaining).toBeCloseTo(dailyLimit, 2);
  });
});

describe('withRetry', () => {
  it('returns result on success', async () => {
    const result = await withRetry(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('throws non-retryable errors immediately', async () => {
    const err = new Error('not retryable');
    await expect(withRetry(() => Promise.reject(err))).rejects.toThrow('not retryable');
  });
});

describe('MODEL_CONFIGS', () => {
  it('has all required model configs', () => {
    expect(MODEL_CONFIGS['gpt-4o']).toBeDefined();
    expect(MODEL_CONFIGS['gpt-4o-mini']).toBeDefined();
    expect(MODEL_CONFIGS['claude-sonnet']).toBeDefined();
    expect(MODEL_CONFIGS['claude-haiku']).toBeDefined();
  });

  it('gpt-4o-mini is cheaper than gpt-4o', () => {
    expect(MODEL_CONFIGS['gpt-4o-mini']!.costPerMillionInputTokens).toBeLessThan(
      MODEL_CONFIGS['gpt-4o']!.costPerMillionInputTokens
    );
  });
});
