// safety/src/guards/scam-risk.guard.ts — Scam and risk detection for financial claims

import type { SafetyContext, SafetyResult, RiskAssessment } from '../types.js';
import { SCAM_KEYWORDS, CAUTION_KEYWORDS } from '../types.js';
import { SafetyBlockError } from '../errors.js';

export function assessScamRisk(context: SafetyContext): RiskAssessment {
  const content = context.content ?? '';
  const lower = content.toLowerCase();
  const flags: string[] = [];
  let score = 0;

  // Check for scam keywords
  for (const keyword of SCAM_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      flags.push(`scam_keyword:${keyword}`);
      score += 0.3;
    }
  }

  // Check for urgency language
  if (/\b(urgent|immediately|right now|don't miss|hurry|limited time|act now)\b/i.test(content)) {
    flags.push('urgency_language');
    score += 0.2;
  }

  // Check for guarantee language
  if (/\b(guaranteed|100%|no risk|certain|definitely|absolutely)\b/i.test(content)) {
    flags.push('guarantee_language');
    score += 0.15;
  }

  // Check for wallet/transfer request
  if (/\b(send.*0x|send.*eth|transfer.*tokens|connect.*wallet|sign.*transaction)\b/i.test(content)) {
    flags.push('wallet_request');
    score += 0.35;
  }

  // Check if URL is suspicious (requires LinkRiskGuard for full check)
  if (context.url && /\b(bit\.ly|tinyurl|goo\.gl|bit\.do|ow\.ly)\b/i.test(context.url)) {
    flags.push('suspicious_link');
    score += 0.2;
  }

  // Check for claim content (airdrop/claim/reward) — forces higher score
  for (const kw of CAUTION_KEYWORDS) {
    if (lower.includes(kw)) {
      flags.push(`caution_keyword:${kw}`);
      score += 0.1;
    }
  }

  const clampedScore = Math.min(1.0, score);
  const riskLevel: RiskAssessment['riskLevel'] =
    clampedScore >= 0.7 ? 'critical'
    : clampedScore >= 0.5 ? 'high'
    : clampedScore >= 0.3 ? 'medium'
    : 'low';

  return {
    riskLevel,
    flags: flags as any[],
    summary: flags.length
      ? `Scam risk detected: ${flags.join(', ')}`
      : 'No obvious scam indicators',
    score: clampedScore,
  };
}

export function checkScamRisk(context: SafetyContext): SafetyResult {
  if (!context.content) return { safe: true, confidence: 0.5 };

  const assessment = assessScamRisk(context);

  if (assessment.riskLevel === 'critical') {
    return {
      safe: false,
      reason: assessment.summary,
      riskLevel: assessment.riskLevel,
      flag: 'SCAM_RISK',
      confidence: assessment.score,
    };
  }

  if (assessment.riskLevel === 'high') {
    // High risk but not critical — allow with flag
    return {
      safe: true,
      confidence: assessment.score,
      riskLevel: assessment.riskLevel,
    };
  }

  return { safe: true, confidence: 1.0 - assessment.score };
}

export function enforceScamRisk(context: SafetyContext): void {
  const result = checkScamRisk(context);
  if (!result.safe) {
    throw new SafetyBlockError(
      'SCAM_RISK',
      result.reason!,
      'This content has been flagged as potentially risky. Review before proceeding.',
      result.confidence
    );
  }
}

/**
 * Given a claim confidence and whether it's from an official source,
 * return the appropriate response guidance.
 */
export function getClaimResponseGuidance(
  claimConfidence: number,
  isOfficialSource: boolean
): 'unverified' | 'verify_first' | 'cautious' | 'safe' {
  if (!isOfficialSource && claimConfidence < 0.7) return 'unverified';
  if (!isOfficialSource && claimConfidence < 0.85) return 'verify_first';
  if (claimConfidence < 0.85) return 'cautious';
  return 'safe';
}
