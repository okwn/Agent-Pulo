# PLAN_LIMITS.md — User Plan Limits

**Status:** Complete

## Overview

PULO has four plan tiers: FREE, PRO, CREATOR, ADMIN. Limits are enforced at the `SafetyGate` level before any agent action executes.

## Plan Comparison

| Limit | FREE | PRO | CREATOR | ADMIN |
|---|---|---|---|---|
| Mention analyses/day | 5 | 100 | 500 | ∞ |
| Reply suggestions/day | 3 | 50 | 100 | ∞ |
| Radar alerts/day | 1 | 10 | 30 | ∞ |
| Direct cast alerts | ❌ | ✅ (opt-in) | ✅ (opt-in) | ✅ |
| Mini-app notifications | ❌ | ✅ | ✅ | ✅ |
| Auto-publish | ❌ | ❌ | ❌ | ✅ |
| Audit logging | ❌ | ❌ | ❌ | ✅ |

## Daily Reset

All daily counters reset at midnight UTC. The `DailyCounter` class tracks counts by `${userId}:${action}:${date}`.

## Enforcement

Limits are checked via `enforcePlanLimit()` in `SafetyGate.runOrThrow()`:

```typescript
enforcePlanLimit({ userId, plan, action });
// throws SafetyBlockError if exceeded
```

## Upgrade Messaging

When a user hits their limit, the `userFacingMessage` in `SafetyBlockError` guides them to upgrade:

| Action | FREE Message |
|---|---|
| mention_analysis | "You've reached your daily mention analysis limit on the FREE plan. Upgrade to Pro for more." |
| reply_suggestion | "You've reached your daily reply suggestion limit on the FREE plan." |
| radar_alert | "You've reached your daily radar alert limit on the FREE plan." |
| direct_cast | "Direct cast alerts require a Pro or higher plan." |
| auto_publish | "Auto-publish is not enabled on your plan." |
| mini_app_notification | "Mini-app notifications require a Pro or higher plan." |

## Consent Dependencies

Even PRO and CREATOR plans require explicit consent for:
- `direct_cast`: User must enable in settings
- `mini_app_notifications`: User must enable in settings
- `auto_publish`: Only ADMIN can enable (creator requires separate consent)

## Rate Limiting vs Plan Limits

**Plan limits** (daily quotas) are enforced by `PlanLimitsGuard` — these are per-day counts.

**Rate limiting** (token bucket) is enforced by `RateLimiter` — these are per-second throughput limits, independent of plan.

A PRO user could still hit rate limits if they burst too many requests per second.

## Usage Tracking

```typescript
import { getUsageCount, getPlanLimitForAction } from '@pulo/safety';

const used = getUsageCount(userId, 'mention_analysis');
const limit = getPlanLimitForAction(userPlan, 'mention_analysis');
console.log(`${used}/${limit} mention analyses used today`);
```

## Quota Headers (Future API)

When PULO exposes an API, include these headers:
```
X-Pulo-Mentions-Remaining: 3/5
X-Pulo-Replies-Remaining: 2/3
X-Pulo-Radar-Remaining: 0/1
```
