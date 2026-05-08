// truth/src/verdict-engine.ts — Produces verdicts from all analysis components

import { createChildLogger } from '@pulo/observability';
import type {
  Verdict,
  ExtractedClaim,
  EvidenceSummary,
  RiskAssessment,
  TruthReport,
  TruthCheckContext,
} from './types.js';
import type { ReplyAnalysis } from './reply-comment-analyzer.js';
import type { ContradictionResult } from './contradiction-detector.js';
import type { SourceAssessment } from './source-trust-scorer.js';

const log = createChildLogger('verdict-engine');

export interface VerdictInput {
  claim: ExtractedClaim;
  replyAnalysis: ReplyAnalysis;
  contradictionResult: ContradictionResult;
  riskAssessment: RiskAssessment;
  sourceAssessments: SourceAssessment[];
  context: TruthCheckContext;
}

export class TruthVerdictEngine {
  /**
   * Produce a verdict and confidence from all analysis inputs.
   */
  produceVerdict(input: VerdictInput): { verdict: Verdict; confidence: number; reasoning: string } {
    const { claim, replyAnalysis, contradictionResult, riskAssessment } = input;

    // 1. Scam risk overrides everything
    if (riskAssessment.overallRisk === 'critical') {
      return {
        verdict: 'scam_risk',
        confidence: riskAssessment.score,
        reasoning: `Critical scam risk detected: ${riskAssessment.summary}`,
      };
    }

    if (riskAssessment.overallRisk === 'high') {
      return {
        verdict: 'scam_risk',
        confidence: Math.min(0.85, riskAssessment.score + 0.2),
        reasoning: `High scam risk detected: ${riskAssessment.summary}`,
      };
    }

    // 2. Check for insufficient context
    const totalEvidence = contradictionResult.contradictingEvidence.length +
      contradictionResult.supportingEvidence.length;
    const evidenceThreshold = 2;

    if (totalEvidence < evidenceThreshold && claim.confidence < 0.6) {
      return {
        verdict: 'insufficient_context',
        confidence: 0.5,
        reasoning: `Only ${totalEvidence} pieces of evidence found. Not enough to form a verdict.`,
      };
    }

    // 3. Calculate weighted verdict score
    const verdictScore = this.calculateVerdictScore(input);

    // 4. Map score to verdict
    if (verdictScore >= 0.75) {
      return {
        verdict: 'likely_true',
        confidence: verdictScore,
        reasoning: `Strong evidence supports the claim (supporting: ${contradictionResult.supportingEvidence.length}, contradicting: ${contradictionResult.contradictingEvidence.length})`,
      };
    }

    if (verdictScore <= 0.25) {
      return {
        verdict: 'likely_false',
        confidence: 1 - verdictScore,
        reasoning: `Evidence contradicts the claim (supporting: ${contradictionResult.supportingEvidence.length}, contradicting: ${contradictionResult.contradictingEvidence.length})`,
      };
    }

    // 5. Mixed signals
    if (replyAnalysis.overallSentiment === 'mixed' ||
        (contradictionResult.supportingEvidence.length > 0 && contradictionResult.contradictingEvidence.length > 0)) {
      return {
        verdict: 'mixed',
        confidence: 0.5,
        reasoning: `Conflicting evidence found. ${replyAnalysis.keySupportingPoints.length} supporting, ${replyAnalysis.keyContradictingPoints.length} contradicting.`,
      };
    }

    // 6. Unverified (claim but no evidence either way)
    if (totalEvidence === 0) {
      return {
        verdict: 'unverified',
        confidence: 0.3,
        reasoning: 'No evidence found to support or contradict the claim.',
      };
    }

    return {
      verdict: 'unverified',
      confidence: 0.4,
      reasoning: 'Evidence is insufficient or inconclusive.',
    };
  }

  private calculateVerdictScore(input: VerdictInput): number {
    const { claim, replyAnalysis, contradictionResult, riskAssessment, sourceAssessments } = input;

    let score = 0.5; // Start neutral

    // Evidence weight: 40%
    const totalEvidence = contradictionResult.contradictingEvidence.length +
      contradictionResult.supportingEvidence.length;
    if (totalEvidence > 0) {
      const supportRatio = contradictionResult.supportingEvidence.length / totalEvidence;
      // Adjust score: 0.5 ± 0.35 based on evidence
      score = 0.15 + supportRatio * 0.7;
    }

    // Reply sentiment weight: 20%
    const sentimentBonus = {
      supporting: 0.15,
      contradicting: -0.15,
      neutral: 0,
      mixed: -0.05,
    }[replyAnalysis.overallSentiment] ?? 0;
    score += sentimentBonus;

    // Risk adjustment: -20% for high risk
    if (riskAssessment.overallRisk === 'medium') score -= 0.1;
    if (riskAssessment.overallRisk === 'high') score -= 0.2;

    // Source trust adjustment: 15%
    const officialCount = sourceAssessments.filter(s => s.level === 'official').length;
    const highTrustCount = sourceAssessments.filter(s => s.level === 'high_trust').length;
    if (officialCount > 0) score += 0.15;
    else if (highTrustCount > 0) score += 0.08;

    // Claim category: predictions are harder to verify
    if (claim.category === 'prediction') score = score * 0.8 + 0.1;

    // Clamp to 0-1
    return Math.max(0, Math.min(1, score));
  }
}

export const truthVerdictEngine = new TruthVerdictEngine();
