// truth/src/source-trust-scorer.ts — Scores trust level of sources for truth analysis

import { createChildLogger } from '@pulo/observability';
import type { EvidenceItem, SourceAssessment, SourceTrustLevel } from './types.js';

// Re-export SourceAssessment so it can be imported from this module
export type { SourceAssessment } from './types.js';

const log = createChildLogger('source-trust');

// Known official project accounts (these would be configurable)
const KNOWN_OFFICIAL_ACCOUNTS: Record<string, string[]> = {
  ethereum: ['ethereumfoundation', 'VitalikButerin', 'ethereum'],
  bitcoin: ['Bitcoin', 'nikcub', 'aantonop'],
  farcaster: ['farcaster', 'varunsrin', 'messari'],
  warpcast: ['warpcast', 'justingeber'],
  degen: ['degentopboi', '0xjobs'],
};

// High-trust indicators (accounts with many followers that consistently post accurate info)
const HIGH_TRUST_INDICATORS = [
  'official',
  'foundation',
  'team',
  'core',
  'validator',
  'protocol',
];

export class SourceTrustScorer {
  /**
   * Score a list of evidence items by source trust.
   */
  score(evidence: EvidenceItem[]): SourceAssessment[] {
    const assessments: SourceAssessment[] = [];

    for (const item of evidence) {
      assessments.push(this.assessSource(item));
    }

    // Mark official sources and high-trust users
    this.markTrustFlags(assessments);

    log.info({ assessments: assessments.length }, 'Source trust scoring complete');
    return assessments;
  }

  private assessSource(item: EvidenceItem): SourceAssessment {
    const username = (item.authorUsername ?? '').toLowerCase();

    // Check if official account
    for (const [project, accounts] of Object.entries(KNOWN_OFFICIAL_ACCOUNTS)) {
      if (accounts.some((acc: string) => username.includes(acc.toLowerCase()))) {
        return {
          level: 'official',
          source: username,
          reason: `Official ${project} account`,
          confidence: 0.95,
        };
      }
    }

    // Check for official-like username patterns
    if (username.includes('official') || username.includes('foundation') || username.includes('team')) {
      return {
        level: 'official',
        source: username,
        reason: 'Username suggests official source',
        confidence: 0.7,
      };
    }

    // High trust user indicators
    for (const indicator of HIGH_TRUST_INDICATORS) {
      if (username.includes(indicator)) {
        return {
          level: 'high_trust',
          source: username,
          reason: `Account name contains '${indicator}' indicator`,
          confidence: 0.6,
        };
      }
    }

    // Check text for official source claims
    if (item.text.toLowerCase().includes('official announcement') ||
        item.text.toLowerCase().includes('official blog') ||
        item.text.toLowerCase().includes('confirmed by')) {
      return {
        level: 'medium_trust',
        source: username,
        reason: 'Content references official sources',
        confidence: 0.5,
      };
    }

    return {
      level: 'unknown',
      source: username,
      reason: 'No trust indicators found',
      confidence: 0.1,
    };
  }

  private markTrustFlags(assessments: SourceAssessment[]): void {
    for (const a of assessments) {
      if (a.level === 'official') {
        a.confidence = Math.min(1.0, a.confidence + 0.2);
      }
    }
  }

  /**
   * Calculate weighted confidence based on source trust.
   */
  calculateWeightedConfidence(assessments: SourceAssessment[]): number {
    if (assessments.length === 0) return 0.0;

    let totalWeight = 0;
    let weightedSum = 0;

    const weights: Record<SourceTrustLevel, number> = {
      official: 1.0,
      high_trust: 0.8,
      medium_trust: 0.5,
      low_trust: 0.2,
      unknown: 0.1,
    };

    for (const a of assessments) {
      const weight = weights[a.level];
      totalWeight += weight;
      weightedSum += weight * a.confidence;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.0;
  }
}

export const sourceTrustScorer = new SourceTrustScorer();
