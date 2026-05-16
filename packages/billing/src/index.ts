// @pulo/billing — Subscription and plan management
// Provides subscription provider abstraction and plan entitlements

import type { UserPreference } from '../../db/src/schema.js';

// ─── Plan Tiers ────────────────────────────────────────────────────────────────

export enum PlanTier {
  FREE = 'free',
  PRO = 'pro',
  CREATOR = 'creator',
  COMMUNITY = 'community',
  ADMIN = 'admin',
}

export const PLAN_ORDER = [
  PlanTier.FREE,
  PlanTier.PRO,
  PlanTier.CREATOR,
  PlanTier.COMMUNITY,
  PlanTier.ADMIN,
] as const;

export function isValidPlan(plan: string): plan is PlanTier {
  return Object.values(PlanTier).includes(plan as PlanTier);
}

export function getPlanTier(plan: string | undefined): PlanTier {
  if (!plan || !isValidPlan(plan)) return PlanTier.FREE;
  return plan as PlanTier;
}

export function canUpgrade(current: PlanTier, target: PlanTier): boolean {
  if (current === PlanTier.ADMIN) return false; // Can't upgrade past admin
  return PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(current);
}

export function getPlanDisplayName(plan: PlanTier): string {
  const names: Record<PlanTier, string> = {
    [PlanTier.FREE]: 'Free',
    [PlanTier.PRO]: 'Pro',
    [PlanTier.CREATOR]: 'Creator',
    [PlanTier.COMMUNITY]: 'Community',
    [PlanTier.ADMIN]: 'Admin',
  };
  return names[plan];
}

// ─── Entitlements ──────────────────────────────────────────────────────────────

export interface Entitlements {
  // Truth checks
  dailyTruthChecks: number;
  monthlyTruthChecks: number;

  // Radar
  radarInboxSize: number;
  radarAlertsEnabled: boolean;
  advancedRadarEnabled: boolean;

  // Alerts
  directCastAlerts: boolean;
  miniAppNotifications: boolean;
  weeklyDigest: boolean;
  dailyAlertLimit: number;

  // Automation
  autoDraftEnabled: boolean;
  autoPublishEnabled: boolean;
  mentionOnlyMode: boolean;

  // Composer
  voiceProfileEnabled: boolean;
  composerEnabled: boolean;

  // Community
  channelMonitoring: boolean;
  communityDigest: boolean;
  leaderboard: boolean;
  adminReports: boolean;

  // Admin
  allAccess: boolean;
  userManagement: boolean;
  systemAccess: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanTier, Entitlements> = {
  [PlanTier.FREE]: {
    dailyTruthChecks: 5,
    monthlyTruthChecks: 50,
    radarInboxSize: 10,
    radarAlertsEnabled: false,
    advancedRadarEnabled: false,
    directCastAlerts: false,
    miniAppNotifications: true,
    weeklyDigest: false,
    dailyAlertLimit: 20,
    autoDraftEnabled: false,
    autoPublishEnabled: false,
    mentionOnlyMode: true,
    voiceProfileEnabled: false,
    composerEnabled: false,
    channelMonitoring: false,
    communityDigest: false,
    leaderboard: false,
    adminReports: false,
    allAccess: false,
    userManagement: false,
    systemAccess: false,
  },
  [PlanTier.PRO]: {
    dailyTruthChecks: 50,
    monthlyTruthChecks: 500,
    radarInboxSize: 100,
    radarAlertsEnabled: true,
    advancedRadarEnabled: false,
    directCastAlerts: false,
    miniAppNotifications: true,
    weeklyDigest: false,
    dailyAlertLimit: 100,
    autoDraftEnabled: false,
    autoPublishEnabled: false,
    mentionOnlyMode: true,
    voiceProfileEnabled: true,
    composerEnabled: true,
    channelMonitoring: false,
    communityDigest: false,
    leaderboard: false,
    adminReports: false,
    allAccess: false,
    userManagement: false,
    systemAccess: false,
  },
  [PlanTier.CREATOR]: {
    dailyTruthChecks: 200,
    monthlyTruthChecks: 2000,
    radarInboxSize: 500,
    radarAlertsEnabled: true,
    advancedRadarEnabled: true,
    directCastAlerts: true, // Requires separate consent
    miniAppNotifications: true,
    weeklyDigest: true,
    dailyAlertLimit: 500,
    autoDraftEnabled: true,
    autoPublishEnabled: true,
    mentionOnlyMode: false,
    voiceProfileEnabled: true,
    composerEnabled: true,
    channelMonitoring: false,
    communityDigest: false,
    leaderboard: false,
    adminReports: false,
    allAccess: false,
    userManagement: false,
    systemAccess: false,
  },
  [PlanTier.COMMUNITY]: {
    dailyTruthChecks: 100,
    monthlyTruthChecks: 1000,
    radarInboxSize: 250,
    radarAlertsEnabled: true,
    advancedRadarEnabled: false,
    directCastAlerts: false,
    miniAppNotifications: true,
    weeklyDigest: true,
    dailyAlertLimit: 250,
    autoDraftEnabled: false,
    autoPublishEnabled: false,
    mentionOnlyMode: false,
    voiceProfileEnabled: true,
    composerEnabled: true,
    channelMonitoring: true,
    communityDigest: true,
    leaderboard: true,
    adminReports: true,
    allAccess: false,
    userManagement: false,
    systemAccess: false,
  },
  [PlanTier.ADMIN]: {
    dailyTruthChecks: -1, // Unlimited
    monthlyTruthChecks: -1,
    radarInboxSize: -1,
    radarAlertsEnabled: true,
    advancedRadarEnabled: true,
    directCastAlerts: true,
    miniAppNotifications: true,
    weeklyDigest: true,
    dailyAlertLimit: -1,
    autoDraftEnabled: true,
    autoPublishEnabled: true,
    mentionOnlyMode: false,
    voiceProfileEnabled: true,
    composerEnabled: true,
    channelMonitoring: true,
    communityDigest: true,
    leaderboard: true,
    adminReports: true,
    allAccess: true,
    userManagement: true,
    systemAccess: true,
  },
};

// ─── Entitlement Checker ───────────────────────────────────────────────────────

export class EntitlementChecker {
  constructor(private plan: PlanTier) {}

  getEntitlements(): Entitlements {
    return PLAN_ENTITLEMENTS[this.plan];
  }

  hasEntitlement<K extends keyof Entitlements>(key: K): boolean {
    const value = PLAN_ENTITLEMENTS[this.plan][key];
    if (typeof value === 'boolean') return value;
    // For numbers, -1 means unlimited
    if (typeof value === 'number') return value === -1 || value > 0;
    return false;
  }

  getLimit(key: keyof Entitlements): number {
    const value = PLAN_ENTITLEMENTS[this.plan][key];
    if (typeof value === 'number') return value;
    return 0;
  }

  canAccessFeature(feature: keyof Entitlements): boolean {
    return this.hasEntitlement(feature);
  }

  isAdmin(): boolean {
    return this.plan === PlanTier.ADMIN;
  }

  canBypass(): boolean {
    return this.plan === PlanTier.ADMIN;
  }
}

// ─── Subscription Provider Interface ────────────────────────────────────────

export interface SubscriptionInfo {
  plan: PlanTier;
  status: 'active' | 'past_due' | 'canceled' | 'expired';
  expiresAt: Date | null;
  provider: 'mock' | 'hypersub' | 'stripe';
}

export interface UsageInfo {
  castsUsed: number;
  castsLimit: number;
  truthChecksUsed: number;
  truthChecksLimit: number;
  trendsTracked: number;
  trendsLimit: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface SubscriptionProvider {
  readonly name: string;
  getSubscription(userId: number): Promise<SubscriptionInfo | null>;
  getUsage(userId: number): Promise<UsageInfo | null>;
  setPlan(userId: number, plan: PlanTier): Promise<void>;
  cancelSubscription(userId: number): Promise<void>;
}

export class MockSubscriptionProvider implements SubscriptionProvider {
  readonly name = 'mock';

  // In-memory store for testing/demo
  private subscriptions = new Map<number, SubscriptionInfo>();
  private usage = new Map<number, UsageInfo>();

  async getSubscription(userId: number): Promise<SubscriptionInfo | null> {
    return this.subscriptions.get(userId) ?? null;
  }

  async getUsage(userId: number): Promise<UsageInfo | null> {
    const sub = this.subscriptions.get(userId);
    const plan = sub?.plan ?? PlanTier.FREE;
    const limits = PLAN_ENTITLEMENTS[plan];

    // Default usage from preferences or limits
    return this.usage.get(userId) ?? {
      castsUsed: 0,
      castsLimit: limits.dailyAlertLimit * 2, // Approx
      truthChecksUsed: 0,
      truthChecksLimit: limits.dailyTruthChecks,
      trendsTracked: 0,
      trendsLimit: limits.radarInboxSize,
      periodStart: this.getPeriodStart(),
      periodEnd: this.getPeriodEnd(),
    };
  }

  async setPlan(userId: number, plan: PlanTier): Promise<void> {
    this.subscriptions.set(userId, {
      plan,
      status: 'active',
      expiresAt: this.getPlanExpiry(plan),
      provider: 'mock',
    });
  }

  async cancelSubscription(userId: number): Promise<void> {
    const sub = this.subscriptions.get(userId);
    if (sub) {
      sub.status = 'canceled';
      sub.plan = PlanTier.FREE;
    }
  }

  // Helper for testing
  setUsage(userId: number, usage: Partial<UsageInfo>): void {
    const current = this.usage.get(userId) ?? {
      castsUsed: 0,
      castsLimit: 100,
      truthChecksUsed: 0,
      truthChecksLimit: 50,
      trendsTracked: 0,
      trendsLimit: 50,
      periodStart: this.getPeriodStart(),
      periodEnd: this.getPeriodEnd(),
    };
    this.usage.set(userId, { ...current, ...usage });
  }

  private getPeriodStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private getPeriodEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }

  private getPlanExpiry(plan: PlanTier): Date {
    if (plan === PlanTier.FREE) return new Date('2099-12-31');
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
}

export class HypersubProvider implements SubscriptionProvider {
  readonly name = 'hypersub';

  constructor(private apiKey: string = process.env.HYPERSUB_API_KEY ?? '') {}

  async getSubscription(userId: number): Promise<SubscriptionInfo | null> {
    // TODO: Implement hypersub API call
    throw new Error('Hypersub not yet implemented - see SUBSCRIPTION_MODEL.md');
  }

  async getUsage(userId: number): Promise<UsageInfo | null> {
    throw new Error('Hypersub not yet implemented');
  }

  async setPlan(userId: number, plan: PlanTier): Promise<void> {
    throw new Error('Hypersub not yet implemented');
  }

  async cancelSubscription(userId: number): Promise<void> {
    throw new Error('Hypersub not yet implemented');
  }
}

export class StripeProvider implements SubscriptionProvider {
  readonly name = 'stripe';

  constructor(private apiKey: string = process.env.STRIPE_API_KEY ?? '') {}

  async getSubscription(userId: number): Promise<SubscriptionInfo | null> {
    // TODO: Implement Stripe API call
    throw new Error('Stripe not yet implemented - see SUBSCRIPTION_MODEL.md');
  }

  async getUsage(userId: number): Promise<UsageInfo | null> {
    throw new Error('Stripe not yet implemented');
  }

  async setPlan(userId: number, plan: PlanTier): Promise<void> {
    throw new Error('Stripe not yet implemented');
  }

  async cancelSubscription(userId: number): Promise<void> {
    throw new Error('Stripe not yet implemented');
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────────

let _provider: SubscriptionProvider | null = null;

export function createSubscriptionProvider(): SubscriptionProvider {
  if (_provider) return _provider;

  const mode = process.env.PULO_SUBSCRIPTION_PROVIDER ?? 'mock';

  switch (mode) {
    case 'hypersub':
      _provider = new HypersubProvider();
      break;
    case 'stripe':
      _provider = new StripeProvider();
      break;
    default:
      _provider = new MockSubscriptionProvider();
  }

  return _provider;
}

export function resetSubscriptionProvider(): void {
  _provider = null;
}

// ─── Usage Tracker ────────────────────────────────────────────────────────────

export class UsageTracker {
  constructor(
    private userId: number,
    private provider: SubscriptionProvider,
    private entitlements: EntitlementChecker
  ) {}

  async incrementCast(): Promise<boolean> {
    const usage = await this.provider.getUsage(this.userId);
    if (!usage) return false;

    if (usage.castsUsed >= usage.castsLimit) {
      return false; // Limit reached
    }

    // In real impl, this would increment in DB
    return true;
  }

  async incrementTruthCheck(): Promise<boolean> {
    const usage = await this.provider.getUsage(this.userId);
    if (!usage) return false;

    if (usage.truthChecksUsed >= usage.truthChecksLimit) {
      return false;
    }

    return true;
  }

  async getRemainingCasts(): Promise<number> {
    const usage = await this.provider.getUsage(this.userId);
    if (!usage) return 0;
    return Math.max(0, usage.castsLimit - usage.castsUsed);
  }

  async getRemainingTruthChecks(): Promise<number> {
    const usage = await this.provider.getUsage(this.userId);
    if (!usage) return 0;
    return Math.max(0, usage.truthChecksLimit - usage.truthChecksUsed);
  }

  async isWithinLimits(): Promise<boolean> {
    const usage = await this.provider.getUsage(this.userId);
    if (!usage) return false;

    return (
      usage.castsUsed < usage.castsLimit &&
      usage.truthChecksUsed < usage.truthChecksLimit &&
      usage.trendsTracked < usage.trendsLimit
    );
  }
}

// ─── Plan Resolver ────────────────────────────────────────────────────────────

export class PlanResolver {
  constructor(private provider: SubscriptionProvider) {}

  async resolvePlanTier(userId: number): Promise<PlanTier> {
    const sub = await this.provider.getSubscription(userId);
    if (!sub) return PlanTier.FREE;
    return sub.plan;
  }

  async resolveEntitlements(userId: number): Promise<Entitlements> {
    const plan = await this.resolvePlanTier(userId);
    return PLAN_ENTITLEMENTS[plan];
  }

  async createEntitlementChecker(userId: number): Promise<EntitlementChecker> {
    const plan = await this.resolvePlanTier(userId);
    return new EntitlementChecker(plan);
  }
}

// ─── Upgrade CTA Logic ────────────────────────────────────────────────────────

export function shouldShowUpgradeCTA(
  currentPlan: PlanTier,
  requestedFeature: keyof Entitlements,
  usage: UsageInfo | null
): { show: boolean; suggestedPlan: PlanTier } {
  const currentEntitlements = PLAN_ENTITLEMENTS[currentPlan];
  const featureValue = currentEntitlements[requestedFeature];

  // If feature is already enabled, no CTA needed
  if (typeof featureValue === 'boolean' && featureValue) {
    return { show: false, suggestedPlan: currentPlan };
  }

  // If user is hitting limits, suggest upgrade
  if (usage) {
    if (requestedFeature === 'dailyTruthChecks' && usage.truthChecksUsed >= usage.truthChecksLimit) {
      return { show: true, suggestedPlan: suggestUpgradeFrom(currentPlan, 'dailyTruthChecks') };
    }
    if (requestedFeature === 'directCastAlerts' && !featureValue) {
      // Feature requires consent even in higher plans
      return { show: currentPlan === PlanTier.FREE, suggestedPlan: PlanTier.PRO };
    }
  }

  // Find minimum plan that has this feature
  for (const plan of PLAN_ORDER) {
    if (plan === PlanTier.ADMIN) continue;
    const entitlements = PLAN_ENTITLEMENTS[plan];
    const planValue = entitlements[requestedFeature];
    if (typeof planValue === 'boolean' && planValue) {
      return { show: true, suggestedPlan: plan };
    }
  }

  return { show: false, suggestedPlan: currentPlan };
}

function suggestUpgradeFrom(current: PlanTier, feature: keyof Entitlements): PlanTier {
  // Find minimum plan that increases the limit
  for (const plan of PLAN_ORDER) {
    if (plan === current) continue;
    if (plan === PlanTier.ADMIN) continue;
    const currentValue = PLAN_ENTITLEMENTS[current][feature];
    const planValue = PLAN_ENTITLEMENTS[plan][feature];
    if (typeof planValue === 'number' && typeof currentValue === 'number') {
      if (planValue > currentValue) {
        return plan;
      }
    }
  }
  return PlanTier.PRO;
}

// ─── Sync Job ─────────────────────────────────────────────────────────────────

export class SubscriptionSyncJob {
  constructor(private provider: SubscriptionProvider) {}

  async syncUser(userId: number): Promise<void> {
    // In real impl, this would sync with external provider
    // For mock, this is a no-op
  }

  async syncAllUsers(userIds: number[]): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.syncUser(userId);
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }
}

// ─── Reset Job ─────────────────────────────────────────────────────────────────

export class UsageResetJob {
  constructor(private provider: SubscriptionProvider) {}

  async resetUsage(userId: number): Promise<void> {
    // In real impl, this would reset usage counters in DB
    // For mock provider, we just clear the usage map entry
    if (this.provider instanceof MockSubscriptionProvider) {
      const current = await this.provider.getUsage(userId);
      if (current) {
        this.provider.setUsage(userId, {
          castsUsed: 0,
          truthChecksUsed: 0,
          trendsTracked: 0,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      }
    }
  }

  async resetExpiredPeriods(): Promise<number> {
    // Would find all users with expired periods and reset
    // For now, just return 0
    return 0;
  }
}
