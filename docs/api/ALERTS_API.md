# Alerts API

## Endpoints

### GET /api/alerts

List user's alerts.

**Query params:**
- `limit` (default 50, max 100)
- `offset` (default 0)
- `unreadOnly` — `true` to show only unread

**Response:**
```json
{
  "data": [Alert],
  "total": number
}
```

### POST /api/alerts/:id/read

Mark an alert as read.

**Response:**
```json
{ "success": true }
```

### GET /api/settings/alerts

Get user's alert preferences.

**Response:**
```json
{
  "data": {
    "allowedTopics": string[],
    "blockedTopics": string[],
    "riskTolerance": "low" | "medium" | "high",
    "notificationFrequency": "realtime" | "digest" | "minimal",
    "dailyAlertLimit": number,
    "allowMiniAppNotifications": boolean,
    "allowDirectCasts": boolean
  }
}
```

### PATCH /api/settings/alerts

Update alert preferences.

**Body:**
```json
{
  "allowedTopics": ["airdrop", "grant", "scam_warning"],
  "blockedTopics": [],
  "riskTolerance": "medium",
  "notificationFrequency": "realtime",
  "dailyAlertLimit": 50,
  "allowMiniAppNotifications": true,
  "allowDirectCasts": false
}
```

**Response:** Same shape as GET.

### POST /api/admin/alerts/test

Send a test alert (admin only, mock mode only).

**Body:**
```json
{
  "fid": 123,
  "type": "admin_message"
}
```

**Response:**
```json
{
  "success": true,
  "alertId": "uuid"
}
```

## Types

```ts
interface Alert {
  id: string;
  userId: number;
  type: AlertType;
  title: string;
  body: string;
  trendId?: string;
  truthCheckId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date | null;
}

type AlertType =
  | 'trend_detected'
  | 'claim_detected'
  | 'reward_program'
  | 'token_launch'
  | 'grant'
  | 'scam_warning'
  | 'truth_check_ready'
  | 'weekly_digest'
  | 'admin_message';

type DeliveryChannel = 'inbox' | 'miniapp' | 'direct_cast';
```
