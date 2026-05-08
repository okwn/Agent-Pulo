// llm/providers/mock.ts — Mock LLM provider for tests and local dev

import type { z } from 'zod';
import type { LlmMessage, LlmResponse, LlmUsage } from '../types.js';
import { BaseLlmProvider } from './base.js';
import { LlmParseError } from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockResponseFn = (messages: LlmMessage[]) => any;

export class MockLlmProvider extends BaseLlmProvider {
  readonly mode = 'mock' as const;
  readonly providerName = 'mock';

  // Map of run type → mock response generator
  private mockResponses = new Map<string, MockResponseFn>();
  private callHistory: Array<{ messages: LlmMessage[]; response: unknown }> = [];

  constructor() {
    super({ apiKey: 'mock-api-key', timeoutMs: 5000, maxRetries: 0 });
    this.registerDefaultResponses();
  }

  private registerDefaultResponses(): void {
    // intent_classification mock
    this.mockResponses.set('intent_classification', (msgs) => {
      const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user')?.content ?? '';
      const text = lastUserMsg.toLowerCase();
      if (text.includes('airdrop') || text.includes('$')) {
        return { category: 'trend_alert', runType: 'trend_analysis', confidence: 0.85, reasoning: 'mock: trend keyword detected', suggestedTone: 'concise', requiresBackgroundContext: false };
      }
      if (text.includes('true or false') || text.includes('fact check')) {
        return { category: 'truth_check', runType: 'truth_check', confidence: 0.9, reasoning: 'mock: fact check detected', suggestedTone: 'authoritative', requiresBackgroundContext: true };
      }
      return { category: 'mention_reply', runType: 'mention_reply', confidence: 0.8, reasoning: 'mock: default mention reply', suggestedTone: 'friendly', requiresBackgroundContext: false };
    });

    // farcaster_reply mock
    this.mockResponses.set('farcaster_reply', () => ({
      text: 'Thanks for the mention! Happy to help.',
      channelId: null,
      tone: 'friendly',
    }));

    // cast_summary mock
    this.mockResponses.set('cast_summary', () => ({
      summary: 'This cast discusses an airdrop opportunity.',
      sentiment: 'bullish',
      keyPoints: ['Airdrop mention detected', 'Positive sentiment'],
    }));

    // thread_summary mock
    this.mockResponses.set('thread_summary', () => ({
      summary: 'Thread discussing airdrop eligibility.',
      participantCount: 3,
      sentiment: 'mixed',
      keyPoints: ['Multiple users discussing', 'Claims vary in legitimacy'],
    }));

    // truth_check_claim_extraction mock
    this.mockResponses.set('truth_check_claim_extraction', () => ({
      claim: 'Ethereum switched to proof-of-stake',
      claimCategory: 'factual',
      urgency: 'medium',
      contextNeeded: ['When did the switch happen?', 'What sources confirm this?'],
    }));

    // truth_check_verdict mock
    this.mockResponses.set('truth_check_verdict', () => ({
      verdict: 'likely_true',
      confidence: 0.87,
      shortAnswer: 'Yes — Ethereum completed its Merge to proof-of-stake in September 2022.',
      dashboardExplanation: 'The Merge was a major event confirmed by multiple official sources including the Ethereum Foundation and major node operators. The transition from Proof-of-Work to Proof-of-Stake reduced energy consumption by ~99.95%.',
      supportingSignals: ['Official Ethereum Foundation blog post', 'CoinGecko market data'],
      contradictingSignals: [],
      evidenceCastHashes: [],
      sourcesChecked: ['ethereum.org', 'CoinGecko'],
    }));

    // trend_cluster_summary mock
    this.mockResponses.set('trend_cluster_summary', () => ({
      topic: 'DEGEN airdrop',
      category: 'airdrop',
      confidence: 0.78,
      castCount: 42,
      participantFids: [1, 2, 3],
      sentiment: 'bullish',
      urgency: 'high',
      summary: 'Active discussion around DEGEN airdrop claiming process.',
    }));

    // risk_analysis mock
    this.mockResponses.set('risk_analysis', () => ({
      riskLevel: 'low',
      flags: [],
      summary: 'Content poses no significant risk.',
    }));

    // alert_message mock
    this.mockResponses.set('alert_message', () => ({
      alertType: 'airdrop',
      title: 'New Airdrop Detected',
      message: 'Active discussion about potential airdrop. Verify source before engaging.',
      priority: 'medium',
    }));

    // admin_summary mock
    this.mockResponses.set('admin_summary', () => ({
      summary: '5 events processed, 0 escalations.',
      actionItems: [],
      priorityAlerts: [],
    }));
  }

  /**
   * Register a custom mock response for a given run type.
   */
  registerMock(runType: string, fn: MockResponseFn): void {
    this.mockResponses.set(runType, fn);
  }

  /**
   * Override response for a specific run type with a static value.
   */
  setMockResponse<T>(runType: string, value: T): void {
    this.mockResponses.set(runType, () => value);
  }

  async complete<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    _temperature = 0.3,
    _maxTokens?: number
  ): Promise<LlmResponse<T>> {
    const usage: LlmUsage = {
      inputTokens: Math.ceil(messages.reduce((a, m) => a + m.content.length, 0) / 4),
      outputTokens: 50, // mock output
      totalTokens: 0,
    };

    // Try to find a mock response based on the prompt content
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const mockKey = this.findMockKey(lastUserMsg);
    const mockFn = mockKey ? this.mockResponses.get(mockKey) : null;

    let raw: unknown;
    if (mockFn) {
      raw = mockFn(messages);
    } else {
      // Default fallback — try to parse a reasonable default
      raw = { generated: true, text: 'mock response' };
    }

    // Record history
    this.callHistory.push({ messages, response: raw });

    let parsed: T;
    try {
      parsed = schema.parse(raw);
    } catch (parseErr) {
      // Recovery: try to extract JSON from the raw string representation
      const str = String(raw);
      const jsonMatch = str.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = schema.parse(JSON.parse(jsonMatch[0]));
        } catch {
          throw new LlmParseError(str, parseErr);
        }
      } else {
        throw new LlmParseError(str, parseErr);
      }
    }

    return {
      content: parsed,
      usage,
      model: 'mock-model',
      finishReason: 'stop',
    };
  }

  /**
   * Try to match a mock key based on content patterns.
   */
  private findMockKey(text: string): string | null {
    const lower = text.toLowerCase();
    if (lower.includes('airdrop') || lower.includes('trend')) return 'trend_cluster_summary';
    if (lower.includes('true or false') || lower.includes('verdict') || lower.includes('fact check')) return 'truth_check_verdict';
    if (lower.includes('claim')) return 'truth_check_claim_extraction';
    if (lower.includes('summarize') || lower.includes('summary')) return 'cast_summary';
    if (lower.includes('thread')) return 'thread_summary';
    if (lower.includes('alert')) return 'alert_message';
    if (lower.includes('admin')) return 'admin_summary';
    if (lower.includes('risk')) return 'risk_analysis';
    if (lower.includes('reply') || lower.includes('respond')) return 'farcaster_reply';
    if (lower.includes('intent') || lower.includes('classify')) return 'intent_classification';
    return 'farcaster_reply'; // default
  }

  estimateTokens(messages: LlmMessage[]): number {
    return Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  }

  override isConfigured(): boolean {
    return true; // mock always configured
  }

  getCallHistory(): Array<{ messages: LlmMessage[]; response: unknown }> {
    return [...this.callHistory];
  }

  clearHistory(): void {
    this.callHistory = [];
  }
}

export const mockLlmProvider = new MockLlmProvider();