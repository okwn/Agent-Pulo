# Billing API

## Endpoints

### GET /api/billing/plan

Returns the current user's subscription plan and entitlements.

**Response:**
```json
{
  "plan": {
    "tier": "pro",
    "name": "Pro",
    "status": "active",
    "expiresAt": null
  },
  "entitlements": {
    "dailyTruthChecks": 50,
    "monthlyTruthChecks": 500,
    "radarInboxSize": 100,
    "radarAlertsEnabled": true,
    "directCastAlerts": false,
    "miniAppNotifications": true,
    "weeklyDigest": false,
    "autoDraftEnabled": false,
    "voiceProfileEnabled": true,
    "composerEnabled": true
  }
}
```

### GET /api/billing/usage

Returns the current user's usage metrics.

**Response:**
```json
{
  "castsUsed": 47,
  "castsLimit": 50,
  "truthChecksUsed": 12,
  "truthChecksLimit": 100,
  "trendsTracked": 8,
  "trendsLimit": 50,
  "periodStart": "2026-05-08T00:00:00.000Z",
  "periodEnd": "2026-05-09T00:00:00.000Z"
}
```

## Admin Endpoints

### POST /api/admin/subscriptions/sync

Syncs all user subscriptions with the subscription provider. Admin only.

**Response:**
```json
{
  "synced": 42,
  "failed": 0,
  "total": 42
}
```

### POST /api/admin/users/:id/set-plan

Sets a user's plan tier. Admin only.

**Request:**
```json
{
  "plan": "pro"
}
```

**Response:**
```json
{
  "success": true,
  "userId": 123,
  "plan": "pro"
}
```

**Errors:**
- `403 Forbidden` - Non-admin user attempting to change plan
- `400 Bad Request` - Invalid plan tier

## Client API Functions

```typescript
// Get current plan
getBillingPlan(): Promise<PlanDetails>

// Get current usage
getBillingUsage(): Promise<UsageInfo>

// Set user plan (admin only)
setUserPlan(userId: number, plan: PlanTier): Promise<{ success: boolean; userId: number; plan: PlanTier }>
```

## Types

```typescript
type PlanTier = 'free' | 'pro' | 'creator' | 'community' | 'admin';

interface PlanInfo {
  tier: PlanTier;
  name: string;
  status: 'active' | 'past_due' | 'canceled' | 'expired';
  expiresAt: string | null;
}

interface PlanDetails {
  plan: PlanInfo;
  entitlements: {
    dailyTruthChecks: number;
    monthlyTruthChecks: number;
    radarInboxSize: number;
    radarAlertsEnabled: boolean;
    directCastAlerts: boolean;
    miniAppNotifications: boolean;
    weeklyDigest: boolean;
    autoDraftEnabled: boolean;
    voiceProfileEnabled: boolean;
    composerEnabled: boolean;
  };
}

interface UsageInfo {
  castsUsed: number;
  castsLimit: number;
  truthChecksUsed: number;
  truthChecksLimit: number;
  trendsTracked: number;
  trendsLimit: number;
  periodStart: string;
  periodEnd: string;
}
```