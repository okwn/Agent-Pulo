// pipeline/intent.ts — Intent classifier — maps NormalizedEvent to AgentRunType

import type { NormalizedEvent } from '@pulo/farcaster';
import type { IntentClassification, IntentCategory, AgentRunType } from '../types.js';

// Pattern-based intent keywords (no LLM required)
const INTENT_PATTERNS: Record<IntentCategory, { keywords: string[]; weight: number }> = {
  mention_reply: { keywords: ['?', 'how', 'what', 'can you', 'tell me', 'what do you', 'help', 'check'], weight: 0.7 },
  thread_summary: { keywords: ['summarize', 'summary', ' recap ', 'what happened', 'thread'], weight: 0.8 },
  truth_check: { keywords: ['true or false', 'is this accurate', 'fact check', 'verify', 'correct?'], weight: 0.85 },
  trend_alert: { keywords: ['airdrop', 'grant', 'token', 'launch', 'announcement', '$'], weight: 0.6 },
  cast_summary: { keywords: ['explain', 'what does', 'mean', 'context'], weight: 0.7 },
  reply_suggestion: { keywords: ['suggest', 'reply', 'how would you', 'what to say'], weight: 0.8 },
  cast_rewrite: { keywords: ['rewrite', 'better', 'improve', 'rephrase'], weight: 0.85 },
  admin_action: { keywords: ['admin', 'block', 'mute', 'report', 'suspend'], weight: 0.9 },
  dm: { keywords: [], weight: 0.0 }, // type === 'dm' is sufficient
  other: { keywords: [], weight: 0.0 },
};

const RUN_TYPE_MAP: Record<IntentCategory, AgentRunType> = {
  mention_reply: 'mention_reply',
  thread_summary: 'thread_summary',
  truth_check: 'truth_check',
  trend_alert: 'trend_analysis',
  cast_summary: 'cast_summary',
  reply_suggestion: 'reply_suggestion',
  cast_rewrite: 'cast_rewrite',
  admin_action: 'admin_assist',
  dm: 'mention_reply', // DMs routed as mention_reply for now
  other: 'mention_reply',
};

export class IntentClassifier {
  classify(event: NormalizedEvent): IntentClassification {
    // Direct type-based routing
    if (event.type === 'dm') {
      return {
        category: 'dm',
        runType: 'mention_reply',
        confidence: 1.0,
        reasoning: 'Direct message received — routing to mention_reply',
        requiresBackgroundContext: false,
      };
    }

    const text = this.extractText(event);
    const scores = this.scoreIntents(text, event);

    let best: IntentCategory = 'other';
    let bestScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        best = cat as IntentCategory;
      }
    }

    const runType = RUN_TYPE_MAP[best];
    return {
      category: best,
      runType,
      confidence: Math.min(bestScore, 1.0),
      reasoning: this.buildReasoning(best, bestScore, text),
      suggestedTone: this.inferTone(event),
      requiresBackgroundContext: bestScore < 0.7,
    };
  }

  private extractText(event: NormalizedEvent): string {
    switch (event.type) {
      case 'mention': return event.castText;
      case 'reply': return event.castText;
      case 'dm': return event.message;
    }
  }

  private scoreIntents(text: string, event: NormalizedEvent): Record<string, number> {
    const lower = text.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [category, config] of Object.entries(INTENT_PATTERNS)) {
      let score = 0;
      // Sort keywords longest-first to avoid partial matches (e.g. 'fact check' before 'check')
      const sorted = [...config.keywords].sort((a, b) => b.length - a.length);
      for (const kw of sorted) {
        if (lower.includes(kw)) score += config.weight;
      }
      scores[category] = score;
    }

    // DM type is definitive
    if (event.type === 'dm') {
      scores['dm'] = 1.0;
    }

    return scores;
  }

  private inferTone(event: NormalizedEvent): string {
    const text = this.extractText(event);
    const lower = text.toLowerCase();
    if (lower.includes('!') || lower.includes('🔥') || lower.includes('🎉')) return 'playful';
    if (lower.includes('?') || lower.startsWith('how') || lower.startsWith('what')) return 'friendly';
    if (lower.includes('fact') || lower.includes('verify') || lower.includes('true')) return 'authoritative';
    return 'concise';
  }

  private buildReasoning(category: IntentCategory, score: number, text: string): string {
    const snippet = text.length > 50 ? text.slice(0, 50) + '...' : text;
    return `Category: ${category} (score: ${score.toFixed(2)}). Text: "${snippet}"`;
  }
}

export const intentClassifier = new IntentClassifier();