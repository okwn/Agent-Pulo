# Plan Enforcement

How PULO enforces subscription limits and entitlements.

## Enforcement Points

1. **API Gateway** - Checks entitlements before processing requests
2. **UI Components** - Show upgrade CTAs when limits approached
3. **Background Jobs** - Block agents when limits exhausted

## API Enforcement

### Truth Checks
```typescript
// Before running truth check
const usage = await provider.getUsage(userId);
if (usage.truthChecksUsed >= usage.truthChecksLimit) {
  throw new Error('Truth check limit reached');
}
```

### Radar Alerts
```typescript
// Before sending alert
const entitlements = PLAN_ENTITLEMENTS[plan];
if (!entitlements.radarAlertsEnabled) {
  throw new Error('Radar alerts not enabled for your plan');
}
```

### Auto-Draft
```typescript
// Before auto-draft
if (!entitlements.autoDraftEnabled) {
  throw new Error('Auto-draft not enabled for your plan');
}
```

## UI Enforcement

### Upgrade CTA Logic
```typescript
function shouldShowUpgradeCTA(
  currentPlan: PlanTier,
  requestedFeature: keyof Entitlements,
  usage: UsageInfo | null
): { show: boolean; suggestedPlan: PlanTier }
```

Shows upgrade prompt when:
- User hits a usage limit
- User tries to access a feature their plan doesn't have
- User is on Free plan

### Billing Page
- Shows current usage meters
- Shows upgrade prompt if on Free plan
- Allows plan comparison and upgrade

### Pricing Page
- Clear feature comparison
- Links to billing for upgrade flow

## Admin Bypass

Admin users (`PlanTier.ADMIN`) bypass all entitlement checks:
```typescript
if (checker.canBypass()) {
  // Allow access
}
```

Admin plan changes are logged:
```typescript
if (!await isAdmin(req)) {
  console.warn('Unauthorized plan change attempt');
  return reply.status(403);
}
```

## Usage Tracking

Usage is tracked per-day/per-month:
- `UsageResetJob` resets daily counters at midnight UTC
- Monthly counters reset on the 1st of each month

## Direct Cast Alerts Consent

Creator tier (`PlanTier.CREATOR`) has `directCastAlerts: true` but still requires user consent:
```typescript
// Even with Creator plan, must check consent preference
if (entitlements.directCastAlerts && userPreferences.allowDirectCasts) {
  // Send direct cast alert
}
```