// radar/src/trust-weighted-author-scorer.ts — Scores authors by trust level

import { createChildLogger } from '@pulo/observability';
import type { RadarCast } from './types.js';

const log = createChildLogger('trust-author-scorer');

const KNOWN_OFFICIAL_ACCOUNTS: Record<string, string[]> = {
  ethereum: ['ethereumfoundation', 'VitalikButerin', 'ethereum'],
  bitcoin: ['Bitcoin', 'aantonop'],
  farcaster: ['farcaster', 'varunsrin', 'messari'],
  base: ['base', 'baseorg'],
  degen: ['degentopboi', '0xjobs'],
  optimism: ['optimism', 'optimismfound'],
  arbitrum: ['arbitrum', 'arbgovernor'],
};

export interface AuthorTrustScore {
  fid: number;
  username?: string;
  trustLevel: 'official' | 'high_trust' | 'medium_trust' | 'low_trust' | 'unknown';
  trustScore: number; // 0-100
}

export class TrustWeightedAuthorScorer {
  /**
   * Score an author's trust level.
   */
  scoreAuthor(username?: string): AuthorTrustScore {
    const name = (username ?? '').toLowerCase();

    // Check official accounts
    for (const [project, accounts] of Object.entries(KNOWN_OFFICIAL_ACCOUNTS)) {
      if (accounts.some((acc: string) => name.includes(acc.toLowerCase()))) {
        return { fid: 0, username, trustLevel: 'official', trustScore: 95 };
      }
    }

    // Check username patterns
    if (name.includes('official') || name.includes('foundation') || name.includes('team')) {
      return { fid: 0, username, trustLevel: 'high_trust', trustScore: 70 };
    }

    const indicators: Record<string, number> = {
      core: 60, validator: 60, builder: 55, contributor: 55,
      dev: 50, engineer: 50, protocol: 50,
    };
    for (const [ind, score] of Object.entries(indicators)) {
      if (name.includes(ind)) return { fid: 0, username, trustLevel: 'medium_trust', trustScore: score };
    }

    return { fid: 0, username, trustLevel: 'unknown', trustScore: 10 };
  }

  /**
   * Score multiple casts by author trust.
   */
  scoreCasts(casts: RadarCast[]): AuthorTrustScore[] {
    return casts.map(c => this.scoreAuthor(c.authorUsername));
  }

  /**
   * Calculate weighted trust for a trend from its casts.
   */
  calculateTrendTrust(casts: RadarCast[]): { avgTrust: number; officialCount: number; highTrustCount: number } {
    if (casts.length === 0) return { avgTrust: 0, officialCount: 0, highTrustCount: 0 };

    let totalTrust = 0;
    let officialCount = 0;
    let highTrustCount = 0;

    for (const cast of casts) {
      const { trustScore, trustLevel } = this.scoreAuthor(cast.authorUsername);
      totalTrust += trustScore;
      if (trustLevel === 'official') officialCount++;
      if (trustLevel === 'high_trust' || trustLevel === 'official') highTrustCount++;
    }

    return {
      avgTrust: Math.round(totalTrust / casts.length),
      officialCount,
      highTrustCount,
    };
  }
}

export const trustWeightedAuthorScorer = new TrustWeightedAuthorScorer();