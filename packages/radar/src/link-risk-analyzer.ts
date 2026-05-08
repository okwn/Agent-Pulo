// radar/src/link-risk-analyzer.ts — Analyzes links in casts for risk

import { createChildLogger } from '@pulo/observability';
import { SUSPICIOUS_LINK_PATTERNS } from '@pulo/safety';

const log = createChildLogger('link-risk-analyzer');

const SHORTENER_DOMAINS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly'];
const KNOWN_SAFE_DOMAINS = ['ethereum.org', 'coinbase.com', 'binance.com', 'farcaster.xyz', 'warpcast.com', 'github.com'];

export interface LinkRiskResult {
  hasSuspiciousLink: boolean;
  riskScore: number; // 0-1
  suspiciousLinks: string[];
  safeLinks: string[];
}

export class LinkRiskAnalyzer {
  /**
   * Analyze cast text for suspicious links.
   */
  analyze(text: string): LinkRiskResult {
    const links = this.extractLinks(text);
    const suspiciousLinks: string[] = [];
    const safeLinks: string[] = [];

    for (const link of links) {
      const domain = this.extractDomain(link);
      if (this.isSuspicious(domain, link)) {
        suspiciousLinks.push(link);
      } else if (this.isKnownSafe(domain)) {
        safeLinks.push(link);
      }
    }

    const hasSuspiciousLink = suspiciousLinks.length > 0;
    const riskScore = this.calculateRiskScore(suspiciousLinks.length, links.length);

    return { hasSuspiciousLink, riskScore, suspiciousLinks, safeLinks };
  }

  /**
   * Extract URLs from text.
   */
  extractLinks(text: string): string[] {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    return text.match(urlPattern) ?? [];
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  private isSuspicious(domain: string, fullUrl: string): boolean {
    if (!domain) return false;

    // Check shorteners
    if (SHORTENER_DOMAINS.some(d => domain.includes(d))) return true;

    // Check suspicious patterns
    const lowerUrl = fullUrl.toLowerCase();
    if (SUSPICIOUS_LINK_PATTERNS.some(p => p.test(lowerUrl))) return true;

    // Check for address-like paths
    if (fullUrl.includes('0x') && fullUrl.includes('?')) return true;

    return false;
  }

  private isKnownSafe(domain: string): boolean {
    return KNOWN_SAFE_DOMAINS.some(d => domain.includes(d));
  }

  private calculateRiskScore(suspiciousCount: number, totalLinks: number): number {
    if (totalLinks === 0) return 0;
    if (suspiciousCount === 0) return 0;
    return Math.min(0.9, suspiciousCount * 0.3 + (suspiciousCount / totalLinks) * 0.3);
  }
}

export const linkRiskAnalyzer = new LinkRiskAnalyzer();