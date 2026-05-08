// safety/src/guards/link-risk.guard.ts — URL risk analysis

import type { SafetyContext, SafetyResult } from '../types.js';
import { SUSPICIOUS_LINK_PATTERNS } from '../types.js';
import { SafetyBlockError } from '../errors.js';

export function checkLinkRisk(context: SafetyContext): SafetyResult {
  const url = context.url;
  if (!url) return { safe: true, confidence: 1.0 };

  const lower = url.toLowerCase();

  // Check for URL shorteners (common in phishing)
  for (const pattern of SUSPICIOUS_LINK_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        safe: false,
        reason: `Suspicious URL shortener detected: ${pattern.source}`,
        flag: 'LINK_RISK',
        confidence: 0.85,
      };
    }
  }

  // Check for IP-based URLs
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(url)) {
    return {
      safe: false,
      reason: 'IP-based URL detected',
      flag: 'LINK_RISK',
      confidence: 0.8,
    };
  }

  // Check for suspicious port numbers
  if (/:[0-9]{4,5}\//.test(url)) {
    return {
      safe: false,
      reason: 'Non-standard port detected in URL',
      flag: 'LINK_RISK',
      confidence: 0.6,
    };
  }

  // Check for data: URIs
  if (url.startsWith('data:')) {
    return {
      safe: false,
      reason: 'data: URI detected',
      flag: 'LINK_RISK',
      confidence: 0.9,
    };
  }

  // Check for @ in URLs (often used in phishing)
  if (url.includes('@') && !url.startsWith('mailto:')) {
    return {
      safe: false,
      reason: 'URL contains @ sign (possible phishing attempt)',
      flag: 'LINK_RISK',
      confidence: 0.7,
    };
  }

  return { safe: true, confidence: 0.9 };
}

export function enforceLinkRisk(context: SafetyContext): void {
  const result = checkLinkRisk(context);
  if (!result.safe) {
    throw new SafetyBlockError(
      'LINK_RISK',
      result.reason!,
      'This link has been flagged as potentially unsafe. Do not click suspicious links.',
      result.confidence
    );
  }
}

/**
 * Extract domain from URL for logging (safe — no private data).
 */
export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url;
  }
}
