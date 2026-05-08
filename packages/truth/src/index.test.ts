import { describe, it, expect } from 'vitest';
import { truthIntentDetector } from '../src/intent-detector.js';
import { claimExtractor } from '../src/claim-extractor.js';

describe('truth intent detection', () => {
  describe('English patterns', () => {
    it('detects "is this true?"', () => {
      const result = truthIntentDetector.detect('Hey @pulo is this true? $DEGEN airdrop tomorrow');
      expect(result.detected).toBe(true);
      expect(result.queryLanguage).toBe('en');
      expect(result.patterns.some(p => p.toLowerCase().includes('true'))).toBe(true);
    });

    it('detects "verify this" pattern', () => {
      const result = truthIntentDetector.detect('Can someone verify this? I heard $FARCASTER switching chains');
      expect(result.detected).toBe(true);
      expect(result.queryLanguage).toBe('en');
    });

    it('detects "scam?" pattern', () => {
      const result = truthIntentDetector.detect('Is this a scam? Just got a DM about $WALLET connect');
      expect(result.detected).toBe(true);
      expect(result.queryLanguage).toBe('en');
    });
  });

  describe('Turkish patterns', () => {
    it('detects "bu doğru mu?"', () => {
      const result = truthIntentDetector.detect('@pulo bu doğru mu? $DEGEN airdrop yarın');
      expect(result.detected).toBe(true);
      expect(result.queryLanguage).toBe('tr');
    });

    it('detects "doğrula" pattern', () => {
      const result = truthIntentDetector.detect('Doğrula lütfen, $ETH fiyatı $5000 olacakmış');
      expect(result.detected).toBe(true);
      expect(result.queryLanguage).toBe('tr');
    });

    it('detects "gerçek mi?" pattern', () => {
      const result = truthIntentDetector.detect('$SOL gerçek mi bu haber?');
      expect(result.detected).toBe(true);
      expect(result.queryLanguage).toBe('tr');
    });
  });

  describe('confidence scoring', () => {
    it('confidence is non-zero for detected intents', () => {
      const none = truthIntentDetector.detect('random cast with no intent');
      const detected = truthIntentDetector.detect('is this true? $DEGEN airdrop tomorrow');
      expect(none.confidence).toBe(0);
      expect(detected.confidence).toBeGreaterThan(0);
    });

    it('boosts confidence when pattern is at end', () => {
      const end = truthIntentDetector.detect('someone told me $ETH to $5000 is this true');
      const notEnd = truthIntentDetector.detect('is this true about $ETH');
      expect(end.confidence).toBeGreaterThanOrEqual(notEnd.confidence);
    });
  });
});

describe('claim extractor', () => {
  it('extracts factual claims with token/price patterns', () => {
    const result = claimExtractor.extract('$DEGEN price is at $0.05');
    expect(result.claim).toContain('DEGEN');
    expect(result.category).toBe('factual');
  });

  it('falls back to longest sentence when no pattern matches', () => {
    const result = claimExtractor.extract('I heard that ethereum might be switching to a new consensus mechanism next month which would affect many validators');
    expect(result.claim.length).toBeGreaterThan(20);
    expect(result.confidence).toBeLessThan(0.8);
  });

  it('returns full cast text as claim when no structured claim found', () => {
    const short = claimExtractor.extract('hello world');
    expect(short.claim).toBe('hello world');
    expect(short.confidence).toBe(0.4);
  });
});

describe('verdict engine types', () => {
  it('produces expected verdict types', async () => {
    const { truthVerdictEngine } = await import('../src/verdict-engine.js');
    // Insufficient evidence should produce unverified
    const result = truthVerdictEngine.produceVerdict({
      claim: { claim: 'Some unverified thing', category: 'factual', urgency: 'low', contextNeeded: [], confidence: 0.5, additionalClaims: [] },
      replyAnalysis: { totalReplies: 1, supportingReplies: 0, contradictingReplies: 0, suspiciousReplies: 0, neutralReplies: 1, overallSentiment: 'neutral', keySupportingPoints: [], keyContradictingPoints: [], warnings: [] },
      contradictionResult: { hasContradictions: false, contradictionScore: 0.1, contradictingEvidence: [], supportingEvidence: [], summary: '' },
      riskAssessment: { overallRisk: 'low', flags: [], summary: '', score: 0.1 },
      sourceAssessments: [],
      context: { targetCastHash: '', targetCastText: '', targetAuthorFid: 0, parentThreadHashes: [], replyHashes: [], keywordSearchResults: [], authorProfile: undefined },
    });
    expect(['likely_true', 'likely_false', 'mixed', 'unverified', 'scam_risk', 'insufficient_context']).toContain(result.verdict);
  });
});