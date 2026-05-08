import { describe, it, expect, beforeEach } from 'vitest';
import {
  PlanTier,
  PLAN_ENTITLEMENTS,
  EntitlementChecker,
  MockSubscriptionProvider,
  UsageTracker,
} from '../src/index.js';

describe('Free Tier Limits', () => {
  const provider = new MockSubscriptionProvider();
  const checker = new EntitlementChecker(PlanTier.FREE);

  it('allows exactly dailyTruthChecks limit', () => {
    const limit = checker.getLimit('dailyTruthChecks');
    expect(limit).toBe(5);
  });

  it('denies pro features', () => {
    expect(checker.hasEntitlement('voiceProfileEnabled')).toBe(false);
    expect(checker.hasEntitlement('composerEnabled')).toBe(false);
  });

  it('denies radarAlertsEnabled', () => {
    expect(checker.hasEntitlement('radarAlertsEnabled')).toBe(false);
  });

  it('denies autoDraftEnabled', () => {
    expect(checker.hasEntitlement('autoDraftEnabled')).toBe(false);
  });
});

describe('Pro Tier Features', () => {
  const checker = new EntitlementChecker(PlanTier.PRO);

  it('allows voiceProfileEnabled', () => {
    expect(checker.hasEntitlement('voiceProfileEnabled')).toBe(true);
  });

  it('allows composerEnabled', () => {
    expect(checker.hasEntitlement('composerEnabled')).toBe(true);
  });

  it('denies directCastAlerts', () => {
    expect(checker.hasEntitlement('directCastAlerts')).toBe(false);
  });

  it('denies autoDraftEnabled', () => {
    expect(checker.hasEntitlement('autoDraftEnabled')).toBe(false);
  });

  it('has correct dailyTruthChecks limit', () => {
    expect(checker.getLimit('dailyTruthChecks')).toBe(50);
  });
});

describe('Creator Tier Features', () => {
  const checker = new EntitlementChecker(PlanTier.CREATOR);

  it('allows autoDraftEnabled', () => {
    expect(checker.hasEntitlement('autoDraftEnabled')).toBe(true);
  });

  it('allows directCastAlerts but requires consent', () => {
    // Entitlement is granted, but consent must still be checked per-user
    expect(checker.hasEntitlement('directCastAlerts')).toBe(true);
  });

  it('allows advancedRadarEnabled', () => {
    expect(checker.hasEntitlement('advancedRadarEnabled')).toBe(true);
  });
});

describe('Admin Bypass', () => {
  const checker = new EntitlementChecker(PlanTier.ADMIN);

  it('canBypass returns true', () => {
    expect(checker.canBypass()).toBe(true);
  });

  it('isAdmin returns true', () => {
    expect(checker.isAdmin()).toBe(true);
  });

  it('has allAccess entitlement', () => {
    expect(checker.hasEntitlement('allAccess')).toBe(true);
  });

  it('has userManagement entitlement', () => {
    expect(checker.hasEntitlement('userManagement')).toBe(true);
  });

  it('has systemAccess entitlement', () => {
    expect(checker.hasEntitlement('systemAccess')).toBe(true);
  });

  it('has unlimited dailyTruthChecks', () => {
    expect(checker.getLimit('dailyTruthChecks')).toBe(-1);
  });
});

describe('Usage Tracking', () => {
  const provider = new MockSubscriptionProvider();
  const checker = new EntitlementChecker(PlanTier.PRO);
  const tracker = new UsageTracker(1, provider, checker);

  beforeEach(async () => {
    // Reset usage for user 1
    provider.setUsage(1, {
      castsUsed: 0,
      castsLimit: 100,
      truthChecksUsed: 0,
      truthChecksLimit: 50,
      trendsTracked: 0,
      trendsLimit: 100,
    });
  });

  it('reports within limits when usage is low', async () => {
    expect(await tracker.isWithinLimits()).toBe(true);
  });

  it('reports no remaining casts when at limit', async () => {
    provider.setUsage(1, { castsUsed: 100 });
    expect(await tracker.getRemainingCasts()).toBe(0);
  });

  it('reports remaining casts correctly', async () => {
    provider.setUsage(1, { castsUsed: 30 });
    expect(await tracker.getRemainingCasts()).toBe(70);
  });

  it('reports remaining truth checks correctly', async () => {
    provider.setUsage(1, { truthChecksUsed: 10 });
    expect(await tracker.getRemainingTruthChecks()).toBe(40);
  });
});

describe('MockSubscriptionProvider', () => {
  const provider = new MockSubscriptionProvider();

  it('starts with no subscription', async () => {
    const sub = await provider.getSubscription(999);
    expect(sub).toBeNull();
  });

  it('setPlan creates a subscription', async () => {
    await provider.setPlan(1, PlanTier.PRO);
    const sub = await provider.getSubscription(1);
    expect(sub).not.toBeNull();
    expect(sub?.plan).toBe(PlanTier.PRO);
    expect(sub?.status).toBe('active');
    expect(sub?.provider).toBe('mock');
  });

  it('cancelSubscription resets to free', async () => {
    await provider.setPlan(1, PlanTier.PRO);
    await provider.cancelSubscription(1);
    const sub = await provider.getSubscription(1);
    expect(sub?.plan).toBe(PlanTier.FREE);
    expect(sub?.status).toBe('canceled');
  });

  it('getUsage returns defaults for new user', async () => {
    const usage = await provider.getUsage(999);
    expect(usage?.castsUsed).toBe(0);
    expect(usage?.truthChecksLimit).toBe(5); // Free tier default
  });

  it('getUsage returns correct limits for pro user', async () => {
    await provider.setPlan(1, PlanTier.PRO);
    const usage = await provider.getUsage(1);
    expect(usage?.truthChecksLimit).toBe(50);
  });

  it('setUsage updates usage data', async () => {
    provider.setUsage(1, { castsUsed: 25 });
    const usage = await provider.getUsage(1);
    expect(usage?.castsUsed).toBe(25);
  });
});

describe('PlanEntitlements values', () => {
  it('free tier has sensible defaults', () => {
    const free = PLAN_ENTITLEMENTS[PlanTier.FREE];
    expect(free.dailyTruthChecks).toBe(5);
    expect(free.radarInboxSize).toBe(10);
    expect(free.autoDraftEnabled).toBe(false);
  });

  it('creator tier enables directCastAlerts', () => {
    const creator = PLAN_ENTITLEMENTS[PlanTier.CREATOR];
    expect(creator.directCastAlerts).toBe(true);
  });

  it('community tier enables channelMonitoring', () => {
    const community = PLAN_ENTITLEMENTS[PlanTier.COMMUNITY];
    expect(community.channelMonitoring).toBe(true);
    expect(community.communityDigest).toBe(true);
    expect(community.leaderboard).toBe(true);
  });
});