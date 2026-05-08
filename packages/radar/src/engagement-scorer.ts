// radar/src/engagement-scorer.ts — Scores engagement metrics for trends

import { createChildLogger } from '@pulo/observability';
import type { RadarCast } from './types.js';

const log = createChildLogger('engagement-scorer');

export interface EngagementScore {
  total: number;
  avgPerCast: number;
  recastScore: number;
  replyScore: number;
  likeScore: number;
}

export class EngagementScorer {
  /**
   * Score a single cast's engagement.
   */
  scoreCast(cast: RadarCast): number {
    const likes = cast.engagementCount ?? 0;
    const recasts = cast.recastCount ?? 0;
    const replies = cast.replyCount ?? 0;

    // Weighted: recasts > replies > likes (viral signal)
    return Math.min(100, recasts * 3 + replies * 1.5 + likes * 0.3);
  }

  /**
   * Score a set of casts for engagement.
   */
  score(casts: RadarCast[]): EngagementScore {
    if (casts.length === 0) {
      return { total: 0, avgPerCast: 0, recastScore: 0, replyScore: 0, likeScore: 0 };
    }

    let total = 0;
    let recastTotal = 0;
    let replyTotal = 0;
    let likeTotal = 0;

    for (const cast of casts) {
      const likes = cast.engagementCount ?? 0;
      const recasts = cast.recastCount ?? 0;
      const replies = cast.replyCount ?? 0;

      total += recasts * 3 + replies * 1.5 + likes * 0.3;
      recastTotal += recasts;
      replyTotal += replies;
      likeTotal += likes;
    }

    return {
      total: Math.round(total),
      avgPerCast: Math.round(total / casts.length),
      recastScore: Math.min(100, Math.log2(recastTotal + 1) * 15),
      replyScore: Math.min(100, Math.log2(replyTotal + 1) * 12),
      likeScore: Math.min(100, Math.log2(likeTotal + 1) * 8),
    };
  }
}

export const engagementScorer = new EngagementScorer();