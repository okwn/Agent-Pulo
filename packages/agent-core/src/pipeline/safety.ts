// pipeline/safety.ts — Safety gate integration point

import type { NormalizedEvent } from '@pulo/farcaster';
import type { SafetyResult } from '../types.js';

// ─── Safety Gate Interface ────────────────────────────────────────────────────

export interface SafetyGate {
  preCheck(event: NormalizedEvent, text: string): Promise<SafetyResult>;
  postCheck(output: unknown, context: string): Promise<SafetyResult>;
}

// ─── No-op Safety Gate (mock / local dev) ─────────────────────────────────────

export class NoOpSafetyGate implements SafetyGate {
  async preCheck(event: NormalizedEvent, text: string): Promise<SafetyResult> {
    return { passed: true, riskLevel: 'low', reason: 'no-op safety precheck passed' };
  }

  async postCheck(output: unknown, context: string): Promise<SafetyResult> {
    return { passed: true, riskLevel: 'low', reason: 'no-op safety postcheck passed' };
  }
}

// ─── Rule-Based Safety Gate (production, no LLM needed) ────────────────────────

export class RuleBasedSafetyGate implements SafetyGate {
  private blockedDomains = ['phishing', 'malware', 'scam'];
  private blockedPatterns = [
    /https?:\/\/[^\s]*\.(tk|ml|ga|cf)\/[^\s]*/i, // free tier domains often used in scams
    /giveaway.*eth/i,
    /free.*nft.*mint/i,
    /\bwallet.*connect\b/i,
    /\bsign.*transaction\b/i,
    /\bprivate.*key\b/i,
  ];

  async preCheck(event: NormalizedEvent, text: string): Promise<SafetyResult> {
    const issues: string[] = [];

    // Check for blocked URL patterns
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = text.match(urlPattern) ?? [];
    for (const url of urls) {
      for (const blocked of this.blockedDomains) {
        if (url.toLowerCase().includes(blocked)) {
          issues.push(`blocked domain in URL: ${blocked}`);
        }
      }
      for (const pattern of this.blockedPatterns) {
        if (pattern.test(url)) {
          issues.push(`suspicious URL pattern detected`);
        }
      }
    }

    // Check text content against blocked patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(text)) {
        issues.push(`suspicious text pattern detected`);
      }
    }

    // Check for potential private key requests
    if (/\b(private_key|seed_phrase|mnemonic|passphrase)\b/i.test(text)) {
      return {
        passed: false,
        riskLevel: 'critical',
        reason: 'Request for sensitive credential information',
        flaggedContent: text.slice(0, 100),
      };
    }

    // Check for wallet drainer references
    if (/\b(wallet.*drain|approve.*token.* LP|nitro.*app)\b/i.test(text)) {
      return {
        passed: false,
        riskLevel: 'critical',
        reason: 'Potential wallet drainer reference detected',
        flaggedContent: text.slice(0, 100),
      };
    }

    if (issues.length > 0) {
      return {
        passed: false,
        riskLevel: 'medium',
        reason: issues.join('; '),
        flaggedContent: text.slice(0, 100),
      };
    }

    return { passed: true, riskLevel: 'low', reason: 'Rule-based precheck passed' };
  }

  async postCheck(output: unknown, context: string): Promise<SafetyResult> {
    // Post-check: verify the output doesn't contain sensitive info
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output ?? '');

    if (/\b(private_key|seed_phrase|mnemonic|passphrase)\b/i.test(outputStr)) {
      return {
        passed: false,
        riskLevel: 'critical',
        reason: 'Output contains sensitive credential information',
      };
    }

    if (/\b(wallet.*connect|0x[a-fA-F0-9]{40})\b/i.test(outputStr)) {
      // Allow wallet addresses in output (public by nature), just flag the pattern
      return {
        passed: true,
        riskLevel: 'low',
        reason: 'Postcheck OK — wallet address is public info',
      };
    }

    return { passed: true, riskLevel: 'low', reason: 'Rule-based postcheck passed' };
  }
}

// ─── Safety Gate Factory ───────────────────────────────────────────────────────

let _safetyGate: SafetyGate | null = null;

export function getSafetyGate(): SafetyGate {
  if (_safetyGate) return _safetyGate;

  // In mock mode, use NoOpSafetyGate
  const mode = process.env.PULO_FARCASTER_MODE ?? 'mock';
  if (mode === 'mock') {
    _safetyGate = new NoOpSafetyGate();
  } else {
    _safetyGate = new RuleBasedSafetyGate();
  }

  return _safetyGate;
}

export function setSafetyGate(gate: SafetyGate): void {
  _safetyGate = gate;
}

export function resetSafetyGate(): void {
  _safetyGate = null;
}