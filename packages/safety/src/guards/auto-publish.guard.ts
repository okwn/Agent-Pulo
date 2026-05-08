// safety/src/guards/auto-publish.guard.ts — Auto-publish gate with confidence and risk thresholds

import type { SafetyContext, SafetyResult } from '../types.js';
import { SafetyBlockError } from '../errors.js';
import { checkLinkRisk } from './link-risk.guard.js';
import { checkScamRisk } from './scam-risk.guard.js';

export interface AutoPublishConfig {
  minConfidence: number;       // Minimum LLM confidence to auto-publish
  allowMediumRisk: boolean;    // Allow medium risk content (with flag)
  allowHighRisk: boolean;      // Allow high risk content (with flag)
}

const DEFAULT_AUTO_PUBLISH_CONFIG: AutoPublishConfig = {
  minConfidence: 0.8,
  allowMediumRisk: false,
  allowHighRisk: false,
};

export function checkAutoPublish(
  context: SafetyContext,
  config: Partial<AutoPublishConfig> = {}
): SafetyResult {
  const cfg = { ...DEFAULT_AUTO_PUBLISH_CONFIG, ...config };

  // If no content/risk data, default to block
  if (!context.content) {
    return {
      safe: false,
      reason: 'No content provided for auto-publish check',
      flag: 'AUTO_PUBLISH_BLOCKED',
      confidence: 1.0,
    };
  }

  // Check scam risk
  const scamResult = checkScamRisk(context);
  if (!scamResult.safe) {
    return {
      safe: false,
      reason: `Scam risk blocks auto-publish: ${scamResult.reason}`,
      flag: 'AUTO_PUBLISH_BLOCKED',
      confidence: scamResult.confidence,
    };
  }

  // Check link risk
  const linkResult = checkLinkRisk(context);
  if (!linkResult.safe) {
    return {
      safe: false,
      reason: `Link risk blocks auto-publish: ${linkResult.reason}`,
      flag: 'AUTO_PUBLISH_BLOCKED',
      confidence: linkResult.confidence,
    };
  }

  // Check confidence threshold
  const confidence = context.claimConfidence ?? 0.5;
  if (confidence < cfg.minConfidence) {
    return {
      safe: false,
      reason: `Confidence ${confidence.toFixed(2)} below minimum ${cfg.minConfidence} for auto-publish`,
      flag: 'AUTO_PUBLISH_BLOCKED',
      confidence: 1.0,
    };
  }

  // Check risk level
  const scamAssessment = { ...scamResult };
  const riskLevel = context.riskLevel ?? 'low';

  if (riskLevel === 'high' || riskLevel === 'critical') {
    if (!cfg.allowHighRisk) {
      return {
        safe: false,
        reason: `Auto-publish blocked: ${riskLevel} risk level`,
        flag: 'AUTO_PUBLISH_BLOCKED',
        confidence: 1.0,
      };
    }
  }

  if (riskLevel === 'medium' && !cfg.allowMediumRisk) {
    return {
      safe: false,
      reason: 'Auto-publish blocked: medium risk content requires review',
      flag: 'AUTO_PUBLISH_BLOCKED',
      confidence: 1.0,
    };
  }

  // Check official source requirement for financial claims
  const content = context.content.toLowerCase();
  const hasFinancialClaim = /\b(airdrop|claim|token|reward|presale|ico|ido)\b/i.test(content);
  if (hasFinancialClaim && !context.isOfficialSource) {
    return {
      safe: false,
      reason: 'Financial claim from non-official source requires manual review',
      flag: 'UNVERIFIED_CLAIM',
      confidence: 0.85,
    };
  }

  return { safe: true, confidence: confidence };
}

export function enforceAutoPublish(
  context: SafetyContext,
  config: Partial<AutoPublishConfig> = {}
): void {
  const result = checkAutoPublish(context, config);
  if (!result.safe) {
    throw new SafetyBlockError(
      'AUTO_PUBLISH_BLOCKED',
      result.reason!,
      'This content cannot be auto-published. Review it manually before posting.',
      result.confidence
    );
  }
}
