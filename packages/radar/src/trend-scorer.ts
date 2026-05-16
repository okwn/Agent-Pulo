// radar/src/trend-scorer.ts — Calculates trend score from multiple signals

import { createChildLogger } from '@pulo/observability';
import type { TrendScoreBreakdown, RadarRiskLevel } from './types.js';
import { CHANNEL_RELEVANCE } from './types.js';

const log = createChildLogger('trend-scorer');

export interface TrendScoringInput {
  castCount: number;
  uniqueAuthorCount: number;
  trustedAuthorCount: number;
  engagementTotal: number;
  channelIds: string[];
  onchainConfirmation: boolean;
  officialSourceCount: number;
  spamSignals: number;
  scamSignals: number;
  velocityPerHour: number;
}

export class TrendScorer {
  /**
   * Calculate total trend score.
   */
  score(input: TrendScoringInput): number {
    const breakdown = this.calculateBreakdown(input);
    return breakdown.total;
  }

  /**
   * Calculate full score breakdown.
   */
  calculateBreakdown(input: TrendScoringInput): TrendScoreBreakdown {
    const volume_score = Math.min(1.0, Math.log2(input.castCount + 1) / 10);
    const velocity_score = Math.min(1.0, input.velocityPerHour / 20);
    const unique_author_score = Math.min(1.0, Math.log2(input.uniqueAuthorCount + 1) / 8);
    const trusted_author_score = input.uniqueAuthorCount > 0
      ? Math.min(1.0, input.trustedAuthorCount / input.uniqueAuthorCount + 0.2)
      : 0;
    const engagement_score = Math.min(1.0, Math.log2(input.engagementTotal + 1) / 15);

    const channelScore = input.channelIds.reduce((sum, ch) => sum + (CHANNEL_RELEVANCE[ch] ?? 0.3), 0);
    const channel_relevance_score = Math.min(1.0, channelScore / Math.max(1, input.channelIds.length));

    const onchain_or_official_confirmation_score = input.onchainConfirmation
      ? 0.5 + Math.min(0.5, input.officialSourceCount * 0.15)
      : 0;

    const spam_score = Math.min(0.5, input.spamSignals * 0.15);
    const scam_risk_score = Math.min(0.8, input.scamSignals * 0.3);

    const total = Math.max(0, Math.min(100,
      (volume_score * 0.15 + velocity_score * 0.15 + unique_author_score * 0.1
        + trusted_author_score * 0.15 + engagement_score * 0.1
        + channel_relevance_score * 0.05 + onchain_or_official_confirmation_score * 0.1
        - spam_score - scam_risk_score) * 100
    ));

    return {
      volume_score: Math.round(volume_score * 100) / 100,
      velocity_score: Math.round(velocity_score * 100) / 100,
      unique_author_score: Math.round(unique_author_score * 100) / 100,
      trusted_author_score: Math.round(trusted_author_score * 100) / 100,
      engagement_score: Math.round(engagement_score * 100) / 100,
      channel_relevance_score: Math.round(channel_relevance_score * 100) / 100,
      official_confirmation_score: Math.round(onchain_or_official_confirmation_score * 100) / 100,
      spam_score: Math.round(spam_score * 100) / 100,
      scam_risk_score: Math.round(scam_risk_score * 100) / 100,
      total: Math.round(total),
    };
  }

  /**
   * Calculate velocity (mentions per hour).
   */
  calculateVelocity(castCount: number, firstSeen: Date, lastSeen: Date): number {
    const hours = Math.max(1, (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60));
    return Math.round((castCount / hours) * 10) / 10;
  }
}

export const trendScorer = new TrendScorer();