// agent-core/src/pipeline/mention-commands.ts — Pattern-based mention command router

import type { NormalizedEvent } from '@pulo/farcaster';
import type { IntentClassification, IntentCategory, AgentRunType } from '../types.js';

// Supported mention commands
export type MentionCommand =
  | 'summarize'
  | 'explain'
  | 'is_this_true'
  | 'scam_check'
  | 'source'
  | 'smart_reply'
  | 'banger_reply'
  | 'make_clearer'
  | 'thread'
  | 'rate_cast'
  | 'alpha'
  | 'what_to_reply'
  | 'translate_en'
  | 'translate_tr'
  | 'unknown';

export interface MentionCommandResult {
  command: MentionCommand;
  confidence: number;
  reasoning: string;
  requiresBackgroundContext: boolean;
  planRequired?: 'free' | 'pro' | 'team';
  isSafetySensitive: boolean;
}

// Command patterns — sorted longest-first to avoid partial matches
const COMMAND_PATTERNS: Array<{ pattern: RegExp; command: MentionCommand; confidence: number; requiresContext: boolean; planRequired?: 'free' | 'pro' | 'team'; safetySensitive?: boolean }> = [
  // Turkish truth check
  { pattern: /bu do[ğ>g]r[ue] mu\??/i, command: 'is_this_true', confidence: 0.95, requiresContext: false, safetySensitive: true },
  // Turkish scam check
  { pattern: /scam m[ı>i]?\?/i, command: 'scam_check', confidence: 0.95, requiresContext: false, safetySensitive: true },
  // English truth check variants
  { pattern: /(?:is that |is this |is it )?true\??/i, command: 'is_this_true', confidence: 0.9, requiresContext: false, safetySensitive: true },
  { pattern: /is this true\??/i, command: 'is_this_true', confidence: 0.9, requiresContext: false, safetySensitive: true },
  { pattern: /bu do[ğ>g]r[ue]/i, command: 'is_this_true', confidence: 0.9, requiresContext: false, safetySensitive: true },
  // Summarize
  { pattern: /@pulo\s+summarize(?:\s+this\s+thread)?/i, command: 'summarize', confidence: 0.95, requiresContext: true },
  { pattern: /summarize\s+this\s+thread/i, command: 'summarize', confidence: 0.9, requiresContext: true },
  // Explain
  { pattern: /@pulo\s+explain\s+this/i, command: 'explain', confidence: 0.95, requiresContext: false },
  // Source
  { pattern: /@pulo\s+source\??/i, command: 'source', confidence: 0.95, requiresContext: false },
  // Smart reply
  { pattern: /@pulo\s+(?:give\s+me\s+a?\s+)?smart\s+reply/i, command: 'smart_reply', confidence: 0.9, requiresContext: false },
  // Banger reply
  { pattern: /@pulo\s+(?:give\s+me\s+a?\s+)?banger\s+reply/i, command: 'banger_reply', confidence: 0.9, requiresContext: false },
  // Make clearer
  { pattern: /@pulo\s+make\s+(?:this\s+)?clearer/i, command: 'make_clearer', confidence: 0.9, requiresContext: false },
  // Thread
  { pattern: /@pulo\s+(?:turn\s+this\s+into\s+a\s+)?thread/i, command: 'thread', confidence: 0.9, requiresContext: true },
  // Rate
  { pattern: /@pulo\s+rate\s+(?:this\s+)?cast/i, command: 'rate_cast', confidence: 0.9, requiresContext: false },
  // Alpha
  { pattern: /@pulo\s+alpha[?]?/i, command: 'alpha', confidence: 0.95, requiresContext: false },
  // What to reply
  { pattern: /@pulo\s+what\s+(?:should\s+I\s+)?reply/i, command: 'what_to_reply', confidence: 0.9, requiresContext: false },
  // Translate
  { pattern: /@pulo\s+translate\s+(?:to\s+)?turkish/i, command: 'translate_tr', confidence: 0.95, requiresContext: false },
  { pattern: /@pulo\s+translate\s+(?:to\s+)?english/i, command: 'translate_en', confidence: 0.95, requiresContext: false },
];

export class MentionCommandRouter {
  /**
   * Detect which mention command was used, returning 'unknown' if none matches.
   */
  route(event: NormalizedEvent): MentionCommandResult {
    const text = this.extractText(event);

    for (const { pattern, command, confidence, requiresContext, planRequired, safetySensitive } of COMMAND_PATTERNS) {
      if (pattern.test(text)) {
        return {
          command,
          confidence,
          reasoning: `Matched command "${command}" from pattern`,
          requiresBackgroundContext: requiresContext,
          planRequired,
          isSafetySensitive: safetySensitive ?? false,
        };
      }
    }

    return {
      command: 'unknown',
      confidence: 0,
      reasoning: 'No known command pattern matched',
      requiresBackgroundContext: false,
      isSafetySensitive: false,
    };
  }

  /**
   * Classify a generic mention (no specific command) into an intent category.
   */
  classifyGenericMention(event: NormalizedEvent): IntentClassification {
    const text = this.extractText(event).toLowerCase();
    const result = this.route(event);

    if (result.command !== 'unknown') {
      return this.commandToIntent(result);
    }

    // Generic classification for unknown mentions
    if (text.includes('?')) {
      return {
        category: 'mention_reply',
        runType: 'mention_reply',
        confidence: 0.5,
        reasoning: 'Generic question mention',
        requiresBackgroundContext: false,
      };
    }

    return {
      category: 'other',
      runType: 'mention_reply',
      confidence: 0.3,
      reasoning: 'Unrecognized mention intent — likely reply-like',
      requiresBackgroundContext: false,
    };
  }

  private commandToIntent(result: MentionCommandResult): IntentClassification {
    const command = result.command;
    const categoryMap: Record<MentionCommand, IntentCategory> = {
      summarize: 'thread_summary',
      explain: 'cast_summary',
      is_this_true: 'truth_check',
      scam_check: 'other',
      source: 'cast_summary',
      smart_reply: 'reply_suggestion',
      banger_reply: 'reply_suggestion',
      make_clearer: 'cast_rewrite',
      thread: 'thread_summary',
      rate_cast: 'cast_summary',
      alpha: 'cast_summary',
      what_to_reply: 'reply_suggestion',
      translate_en: 'cast_rewrite',
      translate_tr: 'cast_rewrite',
      unknown: 'other',
    };

    const runTypeMap: Record<MentionCommand, AgentRunType> = {
      summarize: 'thread_summary',
      explain: 'cast_summary',
      is_this_true: 'truth_check',
      scam_check: 'risk_analysis',
      source: 'cast_summary',
      smart_reply: 'reply_suggestion',
      banger_reply: 'reply_suggestion',
      make_clearer: 'cast_rewrite',
      thread: 'thread_summary',
      rate_cast: 'cast_summary',
      alpha: 'cast_summary',
      what_to_reply: 'reply_suggestion',
      translate_en: 'cast_rewrite',
      translate_tr: 'cast_rewrite',
      unknown: 'mention_reply',
    };

    return {
      category: categoryMap[command],
      runType: runTypeMap[command],
      confidence: result.confidence,
      reasoning: result.reasoning,
      requiresBackgroundContext: result.requiresBackgroundContext,
    };
  }

  private extractText(event: NormalizedEvent): string {
    if (event.type === 'mention') return event.castText;
    if (event.type === 'reply') return event.castText;
    return event.message;
  }
}

export const mentionCommandRouter = new MentionCommandRouter();
