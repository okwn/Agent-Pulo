// truth/src/scam-signal-detector.ts — Detects scam and risk signals in truth analysis

import { createChildLogger } from '@pulo/observability';
import type { ExtractedClaim, EvidenceItem, RiskAssessment, RiskFlag } from './types.js';
import { SCAM_KEYWORDS, SUSPICIOUS_LINK_PATTERNS } from '@pulo/safety';

const log = createChildLogger('scam-signal-detector');

export class ScamSignalDetector {
  /**
   * Detect scam signals in the claim and evidence.
   */
  detect(claim: ExtractedClaim, evidence: EvidenceItem[]): RiskAssessment {
    const flags: RiskFlag[] = [];
    let score = 0;

    // 1. Check claim for scam keywords
    const claimLower = claim.claim.toLowerCase();
    for (const keyword of SCAM_KEYWORDS) {
      if (claimLower.includes(keyword.toLowerCase())) {
        flags.push({
          type: 'scam',
          severity: 'high',
          description: `Scam keyword detected in claim: "${keyword}"`,
        });
        score += 0.3;
      }
    }

    // 2. Check for urgency in claim
    if (/\b(urgent|immediately|right now|don't miss|hurry|limited time|act now|must act)/i.test(claimLower)) {
      flags.push({
        type: 'manipulation',
        severity: 'medium',
        description: 'Urgency language detected — common in scams',
      });
      score += 0.15;
    }

    // 3. Check for wallet/transfer request in claim
    if (/\b(send.*0x|send.*eth|transfer.*tokens|connect.*wallet|sign.*transaction|drop.*wallet)/i.test(claimLower)) {
      flags.push({
        type: 'phishing',
        severity: 'critical',
        description: 'Wallet request detected — high risk of phishing',
      });
      score += 0.4;
    }

    // 4. Check evidence for suspicious links
    for (const item of evidence) {
      for (const pattern of SUSPICIOUS_LINK_PATTERNS) {
        if (pattern.test(item.text)) {
          flags.push({
            type: 'phishing',
            severity: 'high',
            description: `Suspicious URL shortener detected in evidence from @${item.authorUsername ?? item.authorFid}`,
            castHash: item.castHash,
          });
          score += 0.25;
          break;
        }
      }

      // Check for engagement bait patterns
      if (/\b(follow for|follow me|drop.*address|comment.*address|dm.*to|send.*dm)/i.test(item.text)) {
        flags.push({
          type: 'engagement_bait',
          severity: 'medium',
          description: 'Engagement bait pattern detected in reply',
          castHash: item.castHash,
        });
        score += 0.1;
      }
    }

    // 5. Check for suspicious patterns in claim itself
    if (/\b(guaranteed.*return|100%.*profit|no risk|double your|80% apy)/i.test(claimLower)) {
      flags.push({
        type: 'scam',
        severity: 'high',
        description: 'Guaranteed profit language — classic scam signal',
      });
      score += 0.3;
    }

    // 6. Missing official verification (for airdrop/claim content)
    const requiresOfficial = /\b(airdrop|claim|distribution|presale|ico|ido)/i.test(claimLower);
    const hasOfficialEvidence = evidence.some(e => e.isOfficialSource);
    if (requiresOfficial && !hasOfficialEvidence && evidence.length > 0) {
      flags.push({
        type: 'misinformation',
        severity: 'medium',
        description: 'Airdrop/claim content with no official source found',
      });
      score += 0.15;
    }

    const clampedScore = Math.min(1.0, score);
    const overallRisk: RiskAssessment['overallRisk'] =
      clampedScore >= 0.7 ? 'critical'
      : clampedScore >= 0.5 ? 'high'
      : clampedScore >= 0.3 ? 'medium'
      : 'low';

    log.info({ score, flags: flags.length, overallRisk }, 'Scam signal detection complete');

    return {
      overallRisk,
      flags,
      summary: this.generateSummary(flags, overallRisk),
      score: clampedScore,
    };
  }

  private generateSummary(flags: RiskFlag[], risk: RiskAssessment['overallRisk']): string {
    if (flags.length === 0) return 'No obvious scam signals detected.';

    const scamFlags = flags.filter(f => f.type === 'scam' || f.type === 'phishing');
    if (scamFlags.length > 0) {
      return `HIGH RISK: ${scamFlags.length} scam/phishing signal(s) detected. Do not engage without verification.`;
    }

    const otherFlags = flags.filter(f => f.type !== 'scam' && f.type !== 'phishing');
    if (otherFlags.length > 0) {
      return `${risk.toUpperCase()} RISK: ${otherFlags.map(f => f.description).join('; ')}`;
    }

    return `${risk.toUpperCase()} RISK: ${flags.length} risk signal(s) detected.`;
  }
}

export const scamSignalDetector = new ScamSignalDetector();
