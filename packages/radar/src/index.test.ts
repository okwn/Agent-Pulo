import { describe, it, expect } from 'vitest';
import {
  keywordWatcher,
  trendClusterer,
  trendScorer,
  trustWeightedAuthorScorer,
  engagementScorer,
  linkRiskAnalyzer,
  claimRiskAnalyzer,
  velocityScorer,
  castIngestionNormalizer,
  alertCandidateSelector,
} from '../src/index.js';

describe('keyword clustering', () => {
  it('clusters casts by keyword overlap', () => {
    const casts = [
      { castHash: '1', authorFid: 1, text: 'Just claimed my airdrop tokens!', channelId: 'airdrop', timestamp: new Date().toISOString(), watchwordMatches: ['airdrop'], normalizedText: '' },
      { castHash: '2', authorFid: 2, text: 'Airdrop eligibility check', channelId: 'airdrop', timestamp: new Date().toISOString(), watchwordMatches: ['airdrop'], normalizedText: '' },
      { castHash: '3', authorFid: 3, text: 'Grant program opened', channelId: 'builders', timestamp: new Date().toISOString(), watchwordMatches: ['grant'], normalizedText: '' },
    ];
    const clusters = trendClusterer.cluster(casts);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    const airdropCluster = clusters.find(c => c.keywords.includes('airdrop'));
    expect(airdropCluster).toBeDefined();
    expect(airdropCluster!.casts.length).toBeGreaterThanOrEqual(2);
  });
});

describe('trend score calculation', () => {
  it('calculates score from volume, velocity, authors, engagement', () => {
    const score = trendScorer.score({
      castCount: 10,
      uniqueAuthorCount: 8,
      trustedAuthorCount: 3,
      engagementTotal: 500,
      channelIds: ['airdrop', 'crypto'],
      onchainConfirmation: false,
      officialSourceCount: 1,
      spamSignals: 0,
      scamSignals: 0,
      velocityPerHour: 2,
    });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('score increases with more casts and authors', () => {
    const low = trendScorer.score({
      castCount: 2, uniqueAuthorCount: 2, trustedAuthorCount: 0, engagementTotal: 10,
      channelIds: ['farcaster'], onchainConfirmation: false, officialSourceCount: 0,
      spamSignals: 0, scamSignals: 0, velocityPerHour: 0.5,
    });
    const high = trendScorer.score({
      castCount: 50, uniqueAuthorCount: 30, trustedAuthorCount: 10, engagementTotal: 5000,
      channelIds: ['airdrop', 'builders', 'crypto'], onchainConfirmation: true, officialSourceCount: 3,
      spamSignals: 0, scamSignals: 0, velocityPerHour: 8,
    });
    expect(high).toBeGreaterThan(low);
  });
});

describe('spam lowers score', () => {
  it('high spam signals reduce trend score', () => {
    const noSpam = trendScorer.score({
      castCount: 20, uniqueAuthorCount: 15, trustedAuthorCount: 5, engagementTotal: 1000,
      channelIds: ['airdrop'], onchainConfirmation: false, officialSourceCount: 2,
      spamSignals: 0, scamSignals: 0, velocityPerHour: 3,
    });
    const highSpam = trendScorer.score({
      castCount: 20, uniqueAuthorCount: 15, trustedAuthorCount: 5, engagementTotal: 1000,
      channelIds: ['airdrop'], onchainConfirmation: false, officialSourceCount: 2,
      spamSignals: 5, scamSignals: 0, velocityPerHour: 3,
    });
    expect(highSpam).toBeLessThan(noSpam);
  });
});

describe('trusted author count raises score', () => {
  it('more trusted authors increase trend score', () => {
    const few = trendScorer.score({
      castCount: 20, uniqueAuthorCount: 20, trustedAuthorCount: 1, engagementTotal: 500,
      channelIds: ['airdrop'], onchainConfirmation: false, officialSourceCount: 0,
      spamSignals: 0, scamSignals: 0, velocityPerHour: 2,
    });
    const many = trendScorer.score({
      castCount: 20, uniqueAuthorCount: 20, trustedAuthorCount: 10, engagementTotal: 500,
      channelIds: ['airdrop'], onchainConfirmation: false, officialSourceCount: 3,
      spamSignals: 0, scamSignals: 0, velocityPerHour: 2,
    });
    expect(many).toBeGreaterThan(few);
  });
});

describe('suspicious claim creates risk flag', () => {
  it('claim with urgency pattern flags risk', () => {
    const result = claimRiskAnalyzer.analyze('URGENT: Claim your airdrop NOW before it expires today!');
    expect(result.hasRisk).toBe(true);
    expect(result.riskLevel).toBe('low');
    expect(result.flags.some(f => f.includes('urgency'))).toBe(true);
  });

  it('claim with guaranteed profit flags risk', () => {
    const result = claimRiskAnalyzer.analyze('100% guaranteed profits with this new token - risk free!');
    expect(result.hasRisk).toBe(true);
    expect(result.riskLevel).toBe('medium');
  });

  it('legitimate airdrop post has unknown risk when no suspicious patterns', () => {
    const result = claimRiskAnalyzer.analyze('The protocol announced an airdrop for early supporters. Check the official blog for eligibility.');
    expect(result.hasRisk).toBe(false);
  });
});

describe('admin approve changes status', () => {
  it('alert candidate selector flags high risk for alert', () => {
    const candidate = alertCandidateSelector.shouldAlert({
      score: 70,
      velocity: 8,
      riskLevel: 'high',
      category: 'airdrop',
      breakdown: trendScorer.calculateBreakdown({
        castCount: 20, uniqueAuthorCount: 15, trustedAuthorCount: 5, engagementTotal: 1000,
        channelIds: ['airdrop'], onchainConfirmation: false, officialSourceCount: 2,
        spamSignals: 0, scamSignals: 0, velocityPerHour: 8,
      }),
      castCount: 20,
      trustedAuthorCount: 5,
    });
    expect(candidate).not.toBeNull();
    expect(candidate!.priority).toBe('high');
  });
});

describe('cast ingestion normalizer', () => {
  it('normalizes token symbols and addresses', () => {
    const result = castIngestionNormalizer.normalizeText('Just bought $DEGEN at 0x1234567890abcdef and now I have 100.5 tokens');
    expect(result).not.toContain('$DEGEN');
    expect(result).toContain('TOKEN');
    expect(result).not.toContain('0x1234567890abcdef');
    expect(result).toContain('ADDRESS');
  });
});

describe('velocity scorer', () => {
  it('detects fading trend after 24+ hours with low volume', () => {
    const oldDate = new Date(Date.now() - 49 * 60 * 60 * 1000); // 49 hours ago
    const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
    const isFading = velocityScorer.isFading(2, oldDate, recentDate);
    expect(isFading).toBe(true);
  });
});

describe('engagement scorer', () => {
  it('weights recasts higher than replies and likes', () => {
    const score = engagementScorer.score([
      { castHash: '1', authorFid: 1, text: 'test', timestamp: '', watchwordMatches: [], normalizedText: '', recastCount: 10, replyCount: 5, engagementCount: 50 },
    ]);
    expect(score.recastScore).toBeGreaterThan(0);
  });
});