# Subscription Model

PULO uses a tiered subscription model with entitlement-based access control.

## Plan Tiers

| Tier | Daily Truth Checks | Radar Inbox | Key Features |
|------|-------------------|-------------|--------------|
| **Free** | 5 | 10 | Basic radar, mention-only mode |
| **Pro** | 50 | 100 | Voice composer, custom alerts |
| **Creator** | 200 | 500 | Advanced radar, direct casts, auto-draft |
| **Community** | 100 | 250 | Channel monitoring, community digest |
| **Admin** | Unlimited | Unlimited | Full access, user management |

## Entitlement System

Every feature maps to a specific entitlement key in `PLAN_ENTITLEMENTS`:

```typescript
interface Entitlements {
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
```

## Subscription Provider Abstraction

```typescript
export interface SubscriptionProvider {
  readonly name: string;
  getSubscription(userId: number): Promise<SubscriptionInfo | null>;
  getUsage(userId: number): Promise<UsageInfo | null>;
  setPlan(userId: number, plan: PlanTier): Promise<void>;
  cancelSubscription(userId: number): Promise<void>;
}
```

### Implemented Providers

1. **MockSubscriptionProvider** - In-memory provider for development/testing
2. **HypersubProvider** - Placeholder for future Hypersub integration
3. **StripeProvider** - Placeholder for future Stripe integration

### Factory Configuration

The provider is selected via `PULO_SUBSCRIPTION_PROVIDER` environment variable:
- `mock` (default) - MockSubscriptionProvider
- `hypersub` - HypersubProvider (not implemented)
- `stripe` - StripeProvider (not implemented)

## Entitlement Checking

```typescript
const checker = new EntitlementChecker(PlanTier.PRO);

// Boolean check
if (checker.hasEntitlement('voiceProfileEnabled')) { ... }

// Limit check
const limit = checker.getLimit('dailyTruthChecks'); // 50 for Pro
```

## Usage Limits

Usage is tracked per-user with daily/monthly resets:

```typescript
interface UsageInfo {
  castsUsed: number;
  castsLimit: number;
  truthChecksUsed: number;
  truthChecksLimit: number;
  trendsTracked: number;
  trendsLimit: number;
  periodStart: Date;
  periodEnd: Date;
}
```

## Admin Plan Management

Admins can change user plans via:
- API: `POST /api/admin/users/:id/set-plan`
- UI: Admin > Users > Click plan badge

Admin bypass is logged:
```typescript
if (!await isAdmin(req)) {
  console.warn('Unauthorized plan change attempt');
  return reply.status(403).send({ error: 'Forbidden' });
}
```

## Feature Flags vs Entitlements

- **Entitlements** - Determined by plan tier, check via `EntitlementChecker`
- **Feature Flags** - User-configurable preferences in settings (tone, humor level, etc.)

Entitlements gate access to features; feature flags customize behavior.