# RADAR API

## Endpoints

### GET /api/radar/trends

List active trends (user-facing).

**Query params:**
- `limit` (default 50, max 100)
- `category` — filter by radar category
- `status` — filter by admin status
- `minScore` — filter by minimum score

**Response:**
```json
{
  "data": [RadarTrend],
  "total": number
}
```

### GET /api/radar/trends/:id

Get a specific trend by ID.

**Response:**
```json
{
  ...RadarTrend,
  "sources": [RadarTrendSource]
}
```

### POST /api/admin/radar/scan

Trigger a radar scan (admin only).

**Body:**
```json
{
  "channels": ["base", "airdrop"],
  "minScore": 30
}
```

**Response:**
```json
{
  "status": "completed",
  "newTrends": number,
  "updatedTrends": number,
  "timestamp": "ISO8601"
}
```

### POST /api/admin/radar/trends/:id/approve

Approve a detected trend, moving it to `approved` status.

**Response:**
```json
{
  "success": true,
  "trend": RadarTrend
}
```

### POST /api/admin/radar/trends/:id/reject

Reject a detected trend.

**Response:**
```json
{
  "success": true,
  "trend": RadarTrend
}
```

## Types

```ts
interface RadarTrend {
  id: string;
  title: string;
  normalizedTitle: string | null;
  category: 'claim' | 'reward_program' | 'token_launch' | 'airdrop' | 'grant' | 'hackathon' | 'scam_warning' | 'social_trend' | 'unknown';
  keywords: string[];
  score: number;
  velocity: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  confidence: number;
  adminStatus: 'detected' | 'watching' | 'approved' | 'rejected' | 'alerted' | 'archived';
  firstSeenAt: string;
  lastSeenAt: string;
  sourceCount: number;
  castCount: number;
  trustedAuthorCount: number;
  summary: string | null;
  metadata: Record<string, unknown>;
}

interface RadarTrendSource {
  castHash: string;
  authorFid: number;
  authorUsername: string;
  text: string;
  engagementScore: number;
  trustScore: number;
  hasSuspiciousLink: boolean;
  hasClaimRisk: boolean;
  createdAt: string;
}
```
