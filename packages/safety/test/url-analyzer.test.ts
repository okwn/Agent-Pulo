import { describe, it, expect } from 'vitest';
import { analyzeURL, analyzeClaimSafety, getSafetyRecommendation, type URLRiskAnalysis } from '../src/url-analyzer.js';

describe('URL Risk Analyzer', () => {
  describe('analyzeURL', () => {
    it('returns low risk for official domains', () => {
      const result = analyzeURL('https://ethereum.org/');
      expect(result.riskLevel).toBe('low');
      expect(result.verifiedOfficial).toBe(true);
    });

    it('returns high risk for impersonation domains', () => {
      const result = analyzeURL('https://ethereum-secure-login.xyz/');
      expect(result.isImpersonation).toBe(true);
      expect(result.riskLevel).toBe('critical');
    });

    it('detects URL shorteners', () => {
      const result = analyzeURL('https://bit.ly/3abc123');
      expect(result.isShortened).toBe(true);
      expect(result.warnings).toContain('URL is shortened - cannot verify final destination');
    });

    it('detects suspicious keywords in domain', () => {
      const result = analyzeURL('https://free-eth-giveaway.xyz/');
      expect(result.risks.some(r => r.includes('free'))).toBe(true);
    });

    it('detects wallet connection requests in path', () => {
      const result = analyzeURL('https://example.com/connect/wallet');
      expect(result.risks.some(r => r.includes('wallet connection'))).toBe(true);
      expect(result.riskLevel).toBe('critical');
    });

    it('detects seed phrase requests', () => {
      const result = analyzeURL('https://metamask-login.com/enter-seed-phrase');
      expect(result.risks.some(r => r.includes('sensitive authentication'))).toBe(true);
    });

    it('detects raw wallet addresses in URL', () => {
      const result = analyzeURL('https://airdrop.com/claim?addr=0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a3');
      expect(result.riskLevel).toBe('critical');
    });

    it('detects risky TLDs', () => {
      const result = analyzeURL('https://secure-wallet.xyz/');
      expect(result.warnings.some(w => w.includes('non-standard TLD'))).toBe(true);
    });

    it('handles invalid URLs', () => {
      const result = analyzeURL('not-a-url');
      expect(result.riskLevel).toBe('high');
      expect(result.risks).toContain('Invalid URL format');
    });
  });

  describe('analyzeClaimSafety', () => {
    it('marks claim as unsafe when no official source detected', () => {
      const result = analyzeClaimSafety(
        'This is an official announcement from Ethereum Foundation!',
        []
      );
      expect(result.warnings).toContain('Claim references "official" source but no verified official link detected');
    });

    it('marks claim as safe with official source', () => {
      const result = analyzeClaimSafety(
        'Ethereum Foundation announced new updates',
        ['https://ethereum.org/']
      );
      expect(result.officialSourceDetected).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('detects urgency tactics', () => {
      const result = analyzeClaimSafety(
        'URGENT: Act now before it\'s too late! Limited time only!',
        []
      );
      expect(result.warnings.some(w => w.includes('urgency tactics'))).toBe(true);
    });

    it('detects guarantee language', () => {
      const result = analyzeClaimSafety(
        'This investment is GUARANTEED to double your money!',
        []
      );
      expect(result.warnings.some(w => w.includes('suspicious financial language'))).toBe(true);
    });

    it('returns critical risk with impersonation link', () => {
      const result = analyzeClaimSafety(
        'Claim your tokens now!',
        ['https://ethereum-claim.fake-xyz.com/']
      );
      expect(result.safe).toBe(false);
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('getSafetyRecommendation', () => {
    it('gives positive feedback for verified official', () => {
      const analysis: URLRiskAnalysis = {
        url: 'https://ethereum.org/',
        riskLevel: 'low',
        risks: [],
        warnings: [],
        isSuspicious: false,
        isShortened: false,
        isImpersonation: false,
        shouldWarn: false,
        verifiedOfficial: true,
      };
      const rec = getSafetyRecommendation(analysis);
      expect(rec).toContain('official source');
    });

    it('warns about impersonation', () => {
      const analysis: URLRiskAnalysis = {
        url: 'https://metamask.fake-site.xyz/',
        riskLevel: 'critical',
        risks: ['Domain impersonates known brand'],
        warnings: [],
        isSuspicious: true,
        isShortened: false,
        isImpersonation: true,
        shouldWarn: true,
        verifiedOfficial: false,
      };
      const rec = getSafetyRecommendation(analysis);
      expect(rec).toContain('DO NOT visit');
    });

    it('warns about shortened URLs', () => {
      const analysis: URLRiskAnalysis = {
        url: 'https://bit.ly/fake',
        riskLevel: 'medium',
        risks: [],
        warnings: ['URL is shortened'],
        isSuspicious: false,
        isShortened: true,
        isImpersonation: false,
        shouldWarn: true,
        verifiedOfficial: false,
      };
      const rec = getSafetyRecommendation(analysis);
      expect(rec).toContain('shortened');
    });
  });
});

describe('Claim Safety Examples', () => {
  it('handles claim with official domain', () => {
    const result = analyzeClaimSafety(
      'Check the official website for updates',
      ['https://uniswap.org/']
    );
    expect(result.officialSourceDetected).toBe(true);
  });

  it('detects high-risk URL with suspicious keywords', () => {
    const result = analyzeClaimSafety(
      'Claim your FREE tokens now!',
      ['https://free-token-airdrop.xyz/claim']
    );
    expect(result.riskLevel).toBe('high');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('detects wallet connection risk', () => {
    const result = analyzeClaimSafety(
      'Connect your wallet to claim rewards',
      ['https://claim-site.xyz/connect-wallet']
    );
    expect(result.linksAnalyzed.length).toBe(1);
    const linkRisk = result.linksAnalyzed[0];
    expect(linkRisk.risks.some(r => r.includes('wallet'))).toBe(true);
  });
});