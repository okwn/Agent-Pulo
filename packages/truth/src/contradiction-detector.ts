// truth/src/contradiction-detector.ts — Detects contradictions in evidence for truth analysis

import { createChildLogger } from '@pulo/observability';
import type { EvidenceItem, ExtractedClaim } from './types.js';

const log = createChildLogger('contradiction-detector');

export interface ContradictionResult {
  hasContradictions: boolean;
  contradictingEvidence: EvidenceItem[];
  supportingEvidence: EvidenceItem[];
  summary: string;
  contradictionScore: number; // 0 = no contradiction, 1 = full contradiction
}

export class ContradictionDetector {
  /**
   * Detect contradictions between claim and evidence.
   */
  detect(claim: ExtractedClaim, evidence: EvidenceItem[]): ContradictionResult {
    const contradicting: EvidenceItem[] = [];
    const supporting: EvidenceItem[] = [];

    const claimLower = claim.claim.toLowerCase();
    const claimWords = new Set(claimLower.split(/\s+/).filter(w => w.length > 3));

    for (const item of evidence) {
      const itemLower = item.text.toLowerCase();

      // Check for explicit contradictions
      const contradictionPatterns = [
        { pattern: /not (?:true|real|accurate|correct)/i, label: 'explicit denial' },
        { pattern: /(?:fake|scam|hoax|fraud)/i, label: 'scam allegation' },
        { pattern: /(?:false|wrong|incorrect|debunked)/i, label: 'factual correction' },
        { pattern: /unverified|unconfirmed|no (?:official|source)/i, label: 'verification absence' },
        { pattern: /different (?:from|than) (?:what|what's) (?:being|is) (?:said|reported)/i, label: 'direct contradiction' },
      ];

      let hasContradiction = false;
      let contradictionLabel = '';

      for (const { pattern, label } of contradictionPatterns) {
        if (pattern.test(itemLower) && this.sharesContext(itemLower, claimLower)) {
          hasContradiction = true;
          contradictionLabel = label;
          break;
        }
      }

      // Check for supporting signals
      const supportPatterns = [
        /confirmed|verified|official|true|accurate|correct|announced/i,
      ];

      const hasSupport = supportPatterns.some(p => p.test(itemLower)) && this.sharesContext(itemLower, claimLower);

      if (hasContradiction) {
        contradicting.push({ ...item, sentiment: 'contradicting' });
      } else if (hasSupport) {
        supporting.push({ ...item, sentiment: 'supporting' });
      }
    }

    const contradictionScore = this.calculateContradictionScore(contradicting, supporting, evidence.length);
    const summary = this.generateSummary(contradicting.length, supporting.length, contradictionScore);

    log.info({
      contradicting: contradicting.length,
      supporting: supporting.length,
      score: contradictionScore,
    }, 'Contradiction detection complete');

    return {
      hasContradictions: contradicting.length > 0,
      contradictingEvidence: contradicting,
      supportingEvidence: supporting,
      summary,
      contradictionScore,
    };
  }

  private sharesContext(itemText: string, claimText: string): boolean {
    const itemWords = new Set(itemText.split(/\s+/).filter(w => w.length > 4));
    const claimWords = new Set(claimText.split(/\s+/).filter(w => w.length > 4));
    const overlap = [...itemWords].filter(w => claimWords.has(w)).length;
    return overlap >= 2; // At least 2 significant words in common
  }

  private calculateContradictionScore(
    contradicting: EvidenceItem[],
    supporting: EvidenceItem[],
    total: number
  ): number {
    if (total === 0) return 0.0;
    // Positive score means more contradiction
    const score = (contradicting.length - supporting.length * 0.5) / total;
    return Math.max(0, Math.min(1, score + 0.5));
  }

  private generateSummary(
    contradictCount: number,
    supportCount: number,
    score: number
  ): string {
    if (score < 0.3) {
      return `Found ${supportCount} supporting and ${contradictCount} contradicting pieces of evidence. Evidence leans supporting.`;
    } else if (score > 0.7) {
      return `Found ${contradictCount} contradicting pieces of evidence. Evidence leans against the claim.`;
    } else if (contradictCount > 0 && supportCount > 0) {
      return `Mixed evidence: ${supportCount} supporting, ${contradictCount} contradicting.`;
    }
    return `Limited or inconclusive evidence found.`;
  }
}

export const contradictionDetector = new ContradictionDetector();
