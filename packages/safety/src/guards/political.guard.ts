// safety/src/guards/political.guard.ts — Placeholder political/sensitive content guard

import type { SafetyContext, SafetyResult } from '../types.js';
import { SafetyBlockError } from '../errors.js';

const POLITICAL_PATTERNS = [
  /\b(election|vote|trump|biden|government regulation|central bank)\b/i,
];

/**
 * Placeholder political and sensitive content guard.
 * TODO: Implement with actual content classification.
 */
export function checkPoliticalContent(context: SafetyContext): SafetyResult {
  if (!context.content) return { safe: true, confidence: 0.0 };

  for (const pattern of POLITICAL_PATTERNS) {
    if (pattern.test(context.content)) {
      return {
        safe: false,
        reason: `Political/sensitive content detected`,
        flag: 'POLITICAL_CONTENT',
        confidence: 0.6,
      };
    }
  }

  return { safe: true, confidence: 0.0 };
}

export function enforcePoliticalContent(context: SafetyContext): void {
  const result = checkPoliticalContent(context);
  if (!result.safe) {
    throw new SafetyBlockError(
      'POLITICAL_CONTENT',
      result.reason!,
      'This content may be politically sensitive. Please review.',
      result.confidence
    );
  }
}
