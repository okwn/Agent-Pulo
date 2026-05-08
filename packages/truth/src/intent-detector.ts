// truth/src/intent-detector.ts — Detects truth check intent in cast text

import { createChildLogger } from '@pulo/observability';
import type { TruthCheckIntent } from './types.js';
import { TRUTH_CHECK_PATTERNS } from './types.js';

const log = createChildLogger('truth-intent-detector');

export class TruthIntentDetector {
  /**
   * Detect if a cast contains a truth-check query.
   */
  detect(text: string): TruthCheckIntent {
    const lower = text.toLowerCase();
    const matchedPatterns: string[] = [];
    let queryLanguage: TruthCheckIntent['queryLanguage'] = 'unknown';

    // Check English patterns
    for (const pattern of TRUTH_CHECK_PATTERNS.en) {
      if (lower.includes(pattern.toLowerCase())) {
        matchedPatterns.push(pattern);
      }
    }

    // Check Turkish patterns
    for (const pattern of TRUTH_CHECK_PATTERNS.tr) {
      if (lower.includes(pattern.toLowerCase())) {
        matchedPatterns.push(pattern);
      }
    }

    // Determine language
    const turkishChars = /[çğıüşöÇĞİÜŞÖ]/;
    const hasTurkishChars = turkishChars.test(text);
    const hasTurkishPatterns = TRUTH_CHECK_PATTERNS.tr.some(p => lower.includes(p.toLowerCase()));
    if (hasTurkishChars || hasTurkishPatterns) {
      queryLanguage = 'tr';
    } else if (matchedPatterns.length > 0) {
      queryLanguage = 'en';
    }

    const detected = matchedPatterns.length > 0;
    const confidence = this.calculateConfidence(matchedPatterns, text);

    log.debug({ detected, patterns: matchedPatterns, language: queryLanguage, confidence }, 'Intent detection result');

    return {
      detected,
      queryLanguage,
      patterns: matchedPatterns,
      confidence,
    };
  }

  private calculateConfidence(patterns: string[], text: string): number {
    if (patterns.length === 0) return 0;

    let confidence = Math.min(0.95, 0.5 + patterns.length * 0.15);

    // Boost if the pattern is at the end or as a question
    const lower = text.toLowerCase();
    if (patterns.some(p => lower.endsWith(p.toLowerCase()))) {
      confidence += 0.1;
    }

    // Check if it's a direct question (?, ¿)
    if (text.includes('?')) {
      confidence += 0.05;
    }

    return Math.min(1.0, confidence);
  }
}

export const truthIntentDetector = new TruthIntentDetector();
