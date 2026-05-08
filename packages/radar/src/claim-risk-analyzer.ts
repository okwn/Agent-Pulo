// radar/src/claim-risk-analyzer.ts — Analyzes claim patterns for risk

import { createChildLogger } from '@pulo/observability';
import { SCAM_KEYWORDS } from '@pulo/safety';
import type { RadarRiskLevel } from './types.js';

const log = createChildLogger('claim-risk-analyzer');

export interface ClaimRiskResult {
  hasRisk: boolean;
  riskLevel: RadarRiskLevel;
  riskScore: number; // 0-1
  flags: string[];
}

export class ClaimRiskAnalyzer {
  /**
   * Analyze cast text for suspicious claim patterns.
   */
  analyze(text: string): ClaimRiskResult {
    const lower = text.toLowerCase();
    const flags: string[] = [];

    // Check scam keywords
    const scamMatches = SCAM_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()));
    for (const kw of scamMatches) flags.push(`scam keyword: ${kw}`);

    // Urgency patterns
    const urgencyPatterns = [
      { pattern: /urgent|immediate|act now|limited time|expires?\s*(today|soon|in\s*\d)/i, label: 'urgency' },
      { pattern: /guaranteed|100%|risk.?free|no.?loss/i, label: 'guaranteed claim' },
      { pattern: /private.key|seed.phrase|wallet.?connect|sign.?transaction/i, label: 'wallet request' },
      { pattern: /airdrop.*claim.*now|claim.*free.*token|free.*nft.*mint/i, label: 'airdrop claim' },
      { pattern: /you've been selected|winner|congratulations.*airdrop/i, label: 'engagement bait' },
    ];

    for (const { pattern, label } of urgencyPatterns) {
      if (pattern.test(lower)) flags.push(`suspicious pattern: ${label}`);
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(flags);
    const riskLevel = this.scoreToLevel(riskScore);

    return {
      hasRisk: flags.length > 0,
      riskLevel,
      riskScore: Math.round(riskScore * 100) / 100,
      flags,
    };
  }

  private calculateRiskScore(flags: string[]): number {
    let score = 0;
    for (const flag of flags) {
      if (flag.includes('wallet')) score += 0.4;
      else if (flag.includes('guaranteed')) score += 0.3;
      else if (flag.includes('scam keyword')) score += 0.3;
      else if (flag.includes('urgency')) score += 0.2;
      else if (flag.includes('engagement bait')) score += 0.15;
      else score += 0.1;
    }
    return Math.min(1.0, score);
  }

  private scoreToLevel(score: number): RadarRiskLevel {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    if (score > 0) return 'low';
    return 'unknown';
  }
}

export const claimRiskAnalyzer = new ClaimRiskAnalyzer();