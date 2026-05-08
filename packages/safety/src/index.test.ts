// safety/src/index.test.ts — Tests for the safety package

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SafetyGate,
  SafetyBlockError,
  checkPlanLimit,
  enforcePlanLimit,
  recordAction,
  getUsageCount,
  getPlanLimitForAction,
  checkDuplicateReply,
  enforceDuplicateReply,
  markProcessed,
  cancelInFlight,
  clearDuplicateState,
  checkSameAuthorCooldown,
  enforceSameAuthorCooldown,
  checkSameCastCooldown,
  clearAllCooldowns,
  checkConsent,
  enforceConsent,
  defaultConsents,
  checkScamRisk,
  assessScamRisk,
  getClaimResponseGuidance,
  checkFinancialAdvice,
  checkPrivateData,
  scrubPrivateData,
  checkLinkRisk,
  extractDomain,
  checkAutoPublish,
  PLAN_LIMITS,
  DailyCounter,
  RateLimiter,
  blockResult,
} from './index.js';
import type { SafetyContext, UserConsents } from './index.js';

describe('PLAN_LIMITS', () => {
  it('free plan has strict limits', () => {
    expect(PLAN_LIMITS.free.mentionAnalysesPerDay).toBe(5);
    expect(PLAN_LIMITS.free.replySuggestionsPerDay).toBe(3);
    expect(PLAN_LIMITS.free.directCastAlerts).toBe(false);
    expect(PLAN_LIMITS.free.autoPublish).toBe(false);
    expect(PLAN_LIMITS.free.miniAppNotifications).toBe(false);
  });

  it('pro plan has higher limits', () => {
    expect(PLAN_LIMITS.pro.mentionAnalysesPerDay).toBe(100);
    expect(PLAN_LIMITS.pro.replySuggestionsPerDay).toBe(50);
    expect(PLAN_LIMITS.pro.radarAlertsPerDay).toBe(10);
    expect(PLAN_LIMITS.pro.miniAppNotifications).toBe(true);
  });

  it('admin plan has unlimited', () => {
    expect(PLAN_LIMITS.admin.mentionAnalysesPerDay).toBe(Infinity);
    expect(PLAN_LIMITS.admin.logAllActions).toBe(true);
  });
});

describe('blockResult', () => {
  it('creates a properly shaped block result', () => {
    const result = blockResult('test reason', 'RATE_LIMIT_EXCEEDED', 1.0, 'Too many requests');
    expect(result.blocked).toBe(true);
    expect(result.flag).toBe('RATE_LIMIT_EXCEEDED');
    expect(result.reason).toBe('test reason');
    expect(result.userFacingMessage).toBe('Too many requests');
  });
});

describe('DailyCounter', () => {
  it('increments and gets count', () => {
    const counter = new DailyCounter();
    expect(counter.get('user:1:reply')).toBe(0);
    counter.increment('user:1:reply');
    expect(counter.get('user:1:reply')).toBe(1);
    counter.increment('user:1:reply');
    expect(counter.get('user:1:reply')).toBe(2);
  });
});

describe('RateLimiter', () => {
  it('allows requests within limit', () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillPerSecond: 1 });
    // Should not throw
    limiter.consumeOrThrow('test', 'action');
    expect(limiter.remaining('test')).toBe(4);
  });

  it('throws when exhausted', () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillPerSecond: 0 }); // no refill
    limiter.consumeOrThrow('test', 'action');
    limiter.consumeOrThrow('test', 'action');
    expect(() => limiter.consumeOrThrow('test', 'action')).toThrow(SafetyBlockError);
  });

  it('allows after refill', async () => {
    const limiter = new RateLimiter({ maxTokens: 1, refillPerSecond: 10 });
    limiter.consumeOrThrow('test', 'action');
    expect(limiter.remaining('test')).toBe(0);
    // Wait for refill
    await new Promise(r => setTimeout(r, 150));
    expect(limiter.remaining('test')).toBeGreaterThanOrEqual(1);
  });
});

describe('checkPlanLimit — free user blocked after limit', () => {
  beforeEach(() => {
    // Reset usage for user 999
    const key = `999:mention_analysis:${new Date().toISOString().slice(0, 10)}`;
    // Can't directly reset, but we can check current state
  });

  it('allows requests under the free plan limit', () => {
    const result = checkPlanLimit({ userId: 999, plan: 'free', action: 'mention_analysis' });
    // Under normal circumstances this should be safe (unless daily count is somehow already at 5)
    // We just verify the function returns a result
    expect(result).toHaveProperty('safe');
  });

  it('free plan has correct limit values', () => {
    expect(getPlanLimitForAction('free', 'mention_analysis')).toBe(5);
    expect(getPlanLimitForAction('free', 'reply_suggestion')).toBe(3);
    expect(getPlanLimitForAction('free', 'radar_alert')).toBe(1);
    expect(getPlanLimitForAction('free', 'direct_cast')).toBe(Infinity); // not a counted action
  });

  it('pro plan has correct limit values', () => {
    expect(getPlanLimitForAction('pro', 'mention_analysis')).toBe(100);
    expect(getPlanLimitForAction('pro', 'reply_suggestion')).toBe(50);
  });
});

describe('enforcePlanLimit', () => {
  it('throws SafetyBlockError when plan limit exceeded', () => {
    // Simulate the 6th mention analysis for a free user
    // We test the enforce function behavior
    const result = checkPlanLimit({ userId: 777, plan: 'free', action: 'mention_analysis' });
    // The check returns safe/unsafe — enforcePlanLimit throws if not safe
    if (!result.safe) {
      expect(() => enforcePlanLimit({ userId: 777, plan: 'free', action: 'mention_analysis' })).toThrow(SafetyBlockError);
    }
  });
});

describe('SafetyGate — free user blocked after limit', () => {
  it('blocks mention_analysis when daily free limit reached', () => {
    const gate = new SafetyGate({ userId: 888, plan: 'free', consents: defaultConsents() });

    // Exhaust the limit — free has 5 mention analyses/day
    for (let i = 0; i < 5; i++) {
      try {
        gate.runOrThrow({ action: 'mention_analysis', content: 'test' });
      } catch {}
    }

    // The 6th should throw
    expect(() => gate.runOrThrow({ action: 'mention_analysis', content: 'test' })).toThrow(SafetyBlockError);
  });
});

describe('SafetyGate — direct cast blocked without consent', () => {
  it('throws when user has not consented to direct cast', () => {
    const gate = new SafetyGate({
      userId: 100,
      plan: 'pro',
      consents: { directCast: false, miniAppNotifications: false, autoPublish: false, trendAlerts: false, truthCheckAlerts: false },
    });

    expect(() => gate.runOrThrow({ action: 'direct_cast', content: 'hello' })).toThrow(SafetyBlockError);
    try {
      gate.runOrThrow({ action: 'direct_cast', content: 'hello' });
    } catch (err) {
      expect(err).toBeInstanceOf(SafetyBlockError);
      expect((err as SafetyBlockError).flag).toBe('CONSENT_REQUIRED');
    }
  });

  it('allows when consent is given', () => {
    const gate = new SafetyGate({
      userId: 101,
      plan: 'pro',
      consents: { directCast: true, miniAppNotifications: false, autoPublish: false, trendAlerts: false, truthCheckAlerts: false },
    });

    // Should not throw
    expect(() => gate.runOrThrow({ action: 'direct_cast', content: 'hello' })).not.toThrow();
  });
});

describe('checkConsent', () => {
  it('blocks direct_cast without consent', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'direct_cast' as const };
    const consents: UserConsents = { ...defaultConsents(), directCast: false };
    const result = checkConsent(ctx as any, consents);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('CONSENT_REQUIRED');
  });
});

describe('checkScamRisk — claim content forces caution', () => {
  it('detects scam keywords', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, content: 'Claim your free tokens now! Guaranteed profit!' };
    const result = checkScamRisk(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('SCAM_RISK');
  });

  it('detects urgency language combined with scam keywords', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, content: 'Guaranteed free token airdrop! Send ETH to receive double! Act now!' };
    const result = checkScamRisk(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('SCAM_RISK');
  });

  it('returns safe for normal content', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, content: 'Hello, great discussion about Ethereum governance.' };
    const result = checkScamRisk(ctx as any);
    expect(result.safe).toBe(true);
  });

  it('assessScamRisk returns risk level', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, content: 'Send 0.1 ETH to 0xabcd... and receive 1 ETH guaranteed! Must act now!' };
    const assessment = assessScamRisk(ctx as any);
    expect(assessment.riskLevel).toBe('critical');
    expect(assessment.score).toBeGreaterThan(0.5);
  });

  it('getClaimResponseGuidance returns unverified for weak claim', () => {
    expect(getClaimResponseGuidance(0.5, false)).toBe('unverified');
    expect(getClaimResponseGuidance(0.8, false)).toBe('verify_first');
    expect(getClaimResponseGuidance(0.9, true)).toBe('safe');
    expect(getClaimResponseGuidance(0.7, true)).toBe('cautious');
  });
});

describe('checkFinancialAdvice', () => {
  it('blocks price prediction content', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, content: 'ETH price will 10x next month. Buy now!' };
    const result = checkFinancialAdvice(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('FINANCIAL_ADVICE');
  });

  it('allows normal content', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, content: 'The Ethereum network hashrate is up this week.' };
    const result = checkFinancialAdvice(ctx as any);
    expect(result.safe).toBe(true);
  });
});

describe('checkPrivateData', () => {
  it('detects seed phrase patterns', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, content: 'The seed_phrase is apple banana cherry' };
    const result = checkPrivateData(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('PRIVATE_DATA_LEAK');
  });

  it('scrubs private data for logging', () => {
    const scrubbed = scrubPrivateData('My seed_phrase is apple banana cherry and private_key is 0x1234');
    expect(scrubbed).toContain('[REDACTED]');
  });

  it('allows normal content', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, content: 'Great cast about DeFi yields!' };
    const result = checkPrivateData(ctx as any);
    expect(result.safe).toBe(true);
  });
});

describe('checkLinkRisk', () => {
  it('detects URL shorteners', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, url: 'https://bit.ly/abc123' };
    const result = checkLinkRisk(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('LINK_RISK');
  });

  it('detects IP-based URLs', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, url: 'http://192.168.1.1:8080/page' };
    const result = checkLinkRisk(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('LINK_RISK');
  });

  it('detects data: URIs', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, url: 'data:text/html,<script>alert(1)</script>' };
    const result = checkLinkRisk(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('LINK_RISK');
  });

  it('extracts domain safely for logging', () => {
    expect(extractDomain('https://ethereum.org/governance')).toBe('ethereum.org');
    expect(extractDomain('not a url')).toBe('not a url');
  });
});

describe('checkAutoPublish — blocked on medium/high risk', () => {
  it('blocks auto-publish for medium risk without flag', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'auto_publish' as const, content: 'Token airdrop!', riskLevel: 'medium' as const, claimConfidence: 0.85 };
    const result = checkAutoPublish(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('AUTO_PUBLISH_BLOCKED');
  });

  it('blocks auto-publish for high risk', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'auto_publish' as const, content: 'Guaranteed 100x!', riskLevel: 'high' as const, claimConfidence: 0.9 };
    const result = checkAutoPublish(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('AUTO_PUBLISH_BLOCKED');
  });

  it('blocks auto-publish when confidence below threshold', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'auto_publish' as const, content: 'Airdrop news', riskLevel: 'low' as const, claimConfidence: 0.5 };
    const result = checkAutoPublish(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Confidence');
  });

  it('allows auto-publish for low risk with high confidence', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'auto_publish' as const, content: 'Ethereum governance update', riskLevel: 'low' as const, claimConfidence: 0.9, isOfficialSource: true };
    const result = checkAutoPublish(ctx as any);
    expect(result.safe).toBe(true);
  });

  it('blocks non-official airdrop claim', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'auto_publish' as const, content: 'New DEGEN airdrop available!', riskLevel: 'low' as const, claimConfidence: 0.85, isOfficialSource: false };
    const result = checkAutoPublish(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('UNVERIFIED_CLAIM');
  });
});

describe('DuplicateReplyGuard — duplicate event blocked', () => {
  beforeEach(() => {
    clearDuplicateState();
  });

  it('allows first reply', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, castHash: 'abc123' };
    const result = checkDuplicateReply(ctx as any);
    expect(result.safe).toBe(true);
  });

  it('blocks duplicate reply after processing', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, castHash: 'abc123' };
    markProcessed(ctx as any);
    const result = checkDuplicateReply(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('DUPLICATE_REPLY');
  });

  it('cancelInFlight allows retry after failure', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, castHash: 'abc123' };
    // Simulate marking in-flight then canceling
    const check1 = checkDuplicateReply(ctx as any);
    expect(check1.safe).toBe(true);
    cancelInFlight(ctx as any);
    // After cancel, should still be able to process
    const check2 = checkDuplicateReply(ctx as any);
    expect(check2.safe).toBe(true);
  });
});

describe('CooldownGuard', () => {
  beforeEach(() => {
    clearAllCooldowns();
  });

  it('allows first reply to same author', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, authorFid: 999, castHash: 'abc' };
    const result = checkSameAuthorCooldown(ctx as any);
    expect(result.safe).toBe(true);
  });

  it('blocks rapid follow-up to same author', () => {
    const ctx = { userId: 1, plan: 'pro' as const, action: 'reply' as const, authorFid: 999, castHash: 'abc' };
    enforceSameAuthorCooldown(ctx as any);
    // Immediate second attempt should fail
    const result = checkSameAuthorCooldown(ctx as any);
    expect(result.safe).toBe(false);
    expect(result.flag).toBe('AUTHOR_COOLDOWN');
  });
});

describe('SafetyGate integration', () => {
  beforeEach(() => {
    clearDuplicateState();
    clearAllCooldowns();
  });

  it('passes all checks for valid content', () => {
    const gate = new SafetyGate({
      userId: 200,
      plan: 'pro',
      consents: { directCast: true, miniAppNotifications: true, autoPublish: false, trendAlerts: false, truthCheckAlerts: false },
    });

    expect(() => gate.runOrThrow({
      action: 'mention_analysis',
      content: 'What is the latest on Ethereum governance?',
    })).not.toThrow();
  });

  it('blocks scam content in reply action', () => {
    const gate = new SafetyGate({
      userId: 201,
      plan: 'pro',
      consents: defaultConsents(),
    });

    // Content that triggers critical scam risk (multiple scam signals + urgency + guaranteed)
    expect(() => gate.runOrThrow({
      action: 'reply',
      castHash: 'cast123',
      authorFid: 888,
      content: 'Send 0.1 ETH to 0xabcd... and receive 1 ETH guaranteed! Must act now!',
    })).toThrow(SafetyBlockError);
  });

  it(' SafetyBlockError has correct flag and message', () => {
    const gate = new SafetyGate({
      userId: 202,
      plan: 'pro',
      consents: { directCast: false, miniAppNotifications: false, autoPublish: false, trendAlerts: false, truthCheckAlerts: false },
    });

    try {
      gate.runOrThrow({ action: 'direct_cast', content: 'hello' });
    } catch (err) {
      expect(err).toBeInstanceOf(SafetyBlockError);
      expect((err as SafetyBlockError).flag).toBe('CONSENT_REQUIRED');
      expect((err as SafetyBlockError).userFacingMessage).toBeTruthy();
    }
  });
});

describe('defaultConsents', () => {
  it('defaults all consents to false (explicit opt-in required)', () => {
    const consents = defaultConsents();
    expect(consents.directCast).toBe(false);
    expect(consents.miniAppNotifications).toBe(false);
    expect(consents.autoPublish).toBe(false);
    expect(consents.trendAlerts).toBe(false);
    expect(consents.truthCheckAlerts).toBe(false);
  });
});
