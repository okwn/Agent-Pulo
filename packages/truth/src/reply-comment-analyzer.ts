// truth/src/reply-comment-analyzer.ts — Analyzes replies and comments for supporting/contradicting signals

import { createChildLogger } from '@pulo/observability';
import type { EvidenceItem, ExtractedClaim } from './types.js';

const log = createChildLogger('reply-analyzer');

export interface ReplyAnalysis {
  totalReplies: number;
  supportingReplies: number;
  contradictingReplies: number;
  suspiciousReplies: number;
  neutralReplies: number;
  overallSentiment: 'supporting' | 'contradicting' | 'neutral' | 'mixed';
  keySupportingPoints: string[];
  keyContradictingPoints: string[];
  warnings: string[];
}

export class ReplyCommentAnalyzer {
  /**
   * Analyze a set of reply casts for sentiment and quality.
   */
  analyze(replies: EvidenceItem[], claim: ExtractedClaim): ReplyAnalysis {
    const supporting: EvidenceItem[] = [];
    const contradicting: EvidenceItem[] = [];
    const suspicious: EvidenceItem[] = [];
    const neutral: EvidenceItem[] = [];

    for (const reply of replies) {
      if (reply.sentiment === 'suspicious' || this.isSuspicious(reply.text)) {
        suspicious.push(reply);
      } else if (reply.sentiment === 'supporting') {
        supporting.push(reply);
      } else if (reply.sentiment === 'contradicting') {
        contradicting.push(reply);
      } else {
        neutral.push(reply);
      }
    }

    const keySupportingPoints = this.extractKeyPoints(supporting, 'supporting');
    const keyContradictingPoints = this.extractKeyPoints(contradicting, 'contradicting');
    const warnings = this.extractWarnings(suspicious);

    const overallSentiment = this.determineOverallSentiment(supporting.length, contradicting.length, neutral.length);

    log.info({
      total: replies.length,
      supporting: supporting.length,
      contradicting: contradicting.length,
      suspicious: suspicious.length,
      sentiment: overallSentiment,
    }, 'Reply analysis complete');

    return {
      totalReplies: replies.length,
      supportingReplies: supporting.length,
      contradictingReplies: contradicting.length,
      suspiciousReplies: suspicious.length,
      neutralReplies: neutral.length,
      overallSentiment,
      keySupportingPoints,
      keyContradictingPoints,
      warnings,
    };
  }

  private isSuspicious(text: string): boolean {
    const lower = text.toLowerCase();
    const suspiciousPatterns = [
      'bit.ly',
      'tinyurl',
      'wallet connect',
      'send 0x',
      'send eth',
      'private key',
      'seed phrase',
      'guaranteed',
      'act now',
      'limited time',
      'double your',
    ];
    return suspiciousPatterns.some(p => lower.includes(p));
  }

  private extractKeyPoints(items: EvidenceItem[], _type: 'supporting' | 'contradicting'): string[] {
    const points: string[] = [];
    for (const item of items.slice(0, 3)) {
      const truncated = item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text;
      points.push(truncated);
    }
    return points;
  }

  private extractWarnings(items: EvidenceItem[]): string[] {
    const warnings: string[] = [];
    for (const item of items.slice(0, 3)) {
      if (item.text.includes('bit.ly') || item.text.includes('tinyurl')) {
        warnings.push(`Suspicious link in reply by @${item.authorUsername ?? item.authorFid}`);
      }
      if (item.text.includes('wallet') || item.text.includes('send')) {
        warnings.push(`Wallet request detected in reply — potential scam`);
      }
      if (item.text.includes('guaranteed') || item.text.includes('act now')) {
        warnings.push(`Urgency language in reply — potential manipulation`);
      }
    }
    return [...new Set(warnings)]; // deduplicate
  }

  private determineOverallSentiment(
    supporting: number,
    contradicting: number,
    neutral: number
  ): ReplyAnalysis['overallSentiment'] {
    const total = supporting + contradicting + neutral;
    if (total === 0) return 'neutral';

    const supportRatio = supporting / total;
    const contradictRatio = contradicting / total;

    if (supportRatio > 0.6) return 'supporting';
    if (contradictRatio > 0.6) return 'contradicting';
    if (supportRatio > 0.3 && contradictRatio > 0.3) return 'mixed';
    return 'neutral';
  }
}

export const replyCommentAnalyzer = new ReplyCommentAnalyzer();
