// safety/src/guards/financial-advice.guard.ts — Blocks unverified financial advice

import type { SafetyContext, SafetyResult } from '../types.js';
import { FINANCIAL_ADVICE_PATTERNS } from '../types.js';
import { SafetyBlockError } from '../errors.js';

export function checkFinancialAdvice(context: SafetyContext): SafetyResult {
  if (!context.content) return { safe: true, confidence: 1.0 };

  for (const pattern of FINANCIAL_ADVICE_PATTERNS) {
    if (pattern.test(context.content)) {
      return {
        safe: false,
        reason: `Financial advice pattern detected: ${pattern.source}`,
        flag: 'FINANCIAL_ADVICE',
        confidence: 0.9,
      };
    }
  }

  return { safe: true, confidence: 1.0 };
}

export function enforceFinancialAdvice(context: SafetyContext): void {
  const result = checkFinancialAdvice(context);
  if (!result.safe) {
    throw new SafetyBlockError(
      'FINANCIAL_ADVICE',
      result.reason!,
      'This content appears to contain unverified financial advice. PULO cannot provide financial recommendations.',
      result.confidence
    );
  }
}

/**
 * Check if content contains price predictions.
 */
export function checkPricePrediction(content: string): boolean {
  return /\b(price will|price target|will be worth|valuation|market cap|when (?:eth|btc|sol) hits)\b/i.test(content);
}
