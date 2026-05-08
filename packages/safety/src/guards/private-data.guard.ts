// safety/src/guards/private-data.guard.ts — Prevents private data (keys, seeds, wallet info) leaks

import type { SafetyContext, SafetyResult } from '../types.js';
import { PRIVATE_DATA_PATTERNS } from '../types.js';
import { SafetyBlockError } from '../errors.js';

export function checkPrivateData(context: SafetyContext): SafetyResult {
  if (!context.content) return { safe: true, confidence: 1.0 };

  for (const pattern of PRIVATE_DATA_PATTERNS) {
    if (pattern.test(context.content)) {
      return {
        safe: false,
        reason: `Private data pattern detected: ${pattern.source}`,
        flag: 'PRIVATE_DATA_LEAK',
        confidence: 0.95,
      };
    }
  }

  // Check for hex strings that look like private keys (64 hex chars, not a cast hash)
  const hexPattern = /\b(0x[a-fA-F0-9]{64})\b/g;
  let match;
  while ((match = hexPattern.exec(context.content)) !== null) {
    const hex = (match[1] ?? '').toLowerCase();
    // Skip known safe patterns (e.g., already redacted)
    if (hex.length > 0 && !hex.startsWith('0x0000') && !hex.includes('0000')) {
      return {
        safe: false,
        reason: `Potentially sensitive hex data detected (looks like a private key)`,
        flag: 'PRIVATE_DATA_LEAK',
        confidence: 0.8,
      };
    }
  }

  return { safe: true, confidence: 1.0 };
}

export function enforcePrivateData(context: SafetyContext): void {
  const result = checkPrivateData(context);
  if (!result.safe) {
    throw new SafetyBlockError(
      'PRIVATE_DATA_LEAK',
      result.reason!,
      'This content contains potentially sensitive data. Never share private keys or seed phrases.',
      result.confidence
    );
  }
}

/**
 * Scrub private data from content for logging purposes.
 */
export function scrubPrivateData(content: string): string {
  let scrubbed = content;
  for (const pattern of PRIVATE_DATA_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]');
  }
  scrubbed = scrubbed.replace(/\b0x[a-fA-F0-9]{64}\b/g, '[HEX_REDACTED]');
  return scrubbed;
}
