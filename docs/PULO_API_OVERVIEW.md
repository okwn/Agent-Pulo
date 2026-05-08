# PULO API Overview

REST API endpoints provided by PULO.

## Base URL

```
http://localhost:4311        # Local development
https://api.your-domain.com  # Production
```

## Authentication

Demo mode uses cookie-based authentication:
- Admin: Session cookie from `/admin/login`
- FID 1 is admin in demo mode

Production mode requires real Far caster OAuth.

## Endpoints

### Health

#### GET /health

Basic health check.

**Response**:
```json
{ "status": "ok", "timestamp": "2026-05-08T..." }
```

#### GET /health/deep

Deep health check with component status.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-05-08T...",
  "uptime": 3600,
  "checks": [
    { "component": "api", "status": "ok", "latencyMs": 1 },
    { "component": "database", "status": "ok", "latencyMs": 5 },
    { "component": "redis", "status": "ok", "latencyMs": 2 },
    { "component": "farcaster", "status": "ok", "details": { "rateLimitRemaining": 145 } },
    { "component": "llm", "status": "ok", "details": { "quotaRemaining": 8500 } },
    { "component": "queue", "status": "ok", "details": { "pendingJobs": 0, "runningJobs": 0 } },
    { "component": "system", "status": "ok", "details": { "memoryUsedMb": 67 } }
  ],
  "metrics": { ... }
}
```

#### GET /health/audit

Recent audit events (admin only).

**Query Parameters**:
- `limit` — Max events to return (default: 100)

**Response**:
```json
{
  "events": [ ... ],
  "total": 42
}
```

### Metrics

#### GET /metrics

Prometheus-compatible metrics endpoint.

**Query Parameters**:
- `format` — `prometheus` (default) or `json`

**Response** (Prometheus format):
```
# TYPE pulo_http_requests_total counter
pulo_http_requests_total{method="GET",path="/health",status="200"} 42

# TYPE pulo_uptime_seconds gauge
pulo_uptime_seconds 3600
```

### User

#### POST /api/user/alerts

Create an alert.

**Request**:
```json
{
  "type": "keyword" | "fid" | "cast_hash" | "truth_verdict",
  "params": {
    "keyword"?: "ethereum",
    "fid"?: 12345,
    "castHash"?: "abc123",
    "verdict"?: "FALSE"
  },
  "delivery": {
    "channel": "cast" | "mini_app"
  }
}
```

**Response**:
```json
{
  "id": "alert_123",
  "created": true
}
```

#### GET /api/user/alerts

List user's alerts.

**Response**:
```json
{
  "alerts": [
    {
      "id": "alert_123",
      "type": "keyword",
      "params": { "keyword": "ethereum" },
      "createdAt": "2026-05-08T..."
    }
  ],
  "total": 1
}
```

#### DELETE /api/user/alerts/:id

Delete an alert.

**Response**:
```json
{ "deleted": true }
```

#### GET /api/user/usage

Get current usage statistics.

**Response**:
```json
{
  "plan": "free",
  "truthChecks": { "used": 5, "limit": 10 },
  "alerts": { "used": 3, "limit": 10 }
}
```

#### POST /api/user/plan

Change subscription plan (admin override only).

**Request**:
```json
{
  "fid": 12345,
  "plan": "pro"
}
```

### Admin

#### GET /api/admin/errors

List all errors.

**Query Parameters**:
- `code` — Filter by error code
- `category` — Filter by category
- `limit` — Max results (default: 100)

**Response**:
```json
{
  "errors": [
    {
      "id": "err_abc123",
      "code": "VALIDATION_FAILED",
      "message": "Invalid FID format",
      "category": "validation",
      "count": 3,
      "firstSeen": "2026-05-08T...",
      "lastSeen": "2026-05-08T..."
    }
  ],
  "total": 1
}
```

#### POST /api/admin/errors/:id/retry

Retry a failed error (admin only).

**Response**:
```json
{
  "success": true,
  "jobId": "job_xyz"
}
```

#### GET /api/admin/jobs

List all jobs.

**Query Parameters**:
- `status` — Filter by status
- `type` — Filter by job type
- `limit` — Max results

**Response**:
```json
{
  "jobs": [
    {
      "id": "job_123",
      "type": "truth_check",
      "status": "completed",
      "createdAt": "2026-05-08T...",
      "completedAt": "2026-05-08T..."
    }
  ],
  "total": 1
}
```

#### POST /api/admin/jobs/:id/cancel

Cancel a job (admin only).

**Response**:
```json
{ "cancelled": true }
```

#### POST /api/admin/jobs/:id/retry

Retry a failed job (admin only).

**Response**:
```json
{
  "success": true,
  "jobId": "job_456"
}
```

#### GET /api/admin/dead-letter

List dead letter queue.

**Response**:
```json
{
  "jobs": [
    {
      "id": "dlq_789",
      "originalJobId": "job_123",
      "type": "truth_check",
      "error": "LLM_TIMEOUT",
      "attempts": 3,
      "failedAt": "2026-05-08T..."
    }
  ],
  "total": 1
}
```

#### POST /api/admin/dead-letter/:id/retry

Retry from dead letter (admin only).

**Response**:
```json
{
  "success": true,
  "jobId": "job_789"
}
```

### Webhook

#### POST /api/webhook/farcaster

Neynar webhook endpoint.

**Headers**:
- `x-neynar-signature` — HMAC signature
- `x-webhook-timestamp` — Unix timestamp

**Body**:
```json
{
  "type": "mention.created",
  "data": {
    "cast": {
      "hash": "abc123",
      "author": { "fid": 12345 },
      "text": "@pulo is this real?"
    }
  }
}
```

**Response**:
```json
{
  "received": true,
  "verified": true,
  "eventId": "evt_xyz"
}
```

#### POST /api/webhook/test (dev only)

Test webhook endpoint (no signature required).

**Body**:
```json
{
  "type": "mention",
  "fid": 123,
  "text": "test mention"
}
```

### Demo

#### POST /api/demo/seed

Seed demo data (admin only).

**Response**:
```json
{
  "success": true,
  "scenarios": 6
}
```

#### POST /api/demo/run

Run demo scenarios (admin only).

**Response**:
```json
{
  "success": true,
  "results": [...]
}
```

#### POST /api/demo/reset

Reset demo data (admin only).

**Response**:
```json
{
  "success": true
}
```

## Error Responses

All endpoints may return:

### 400 Bad Request
```json
{ "error": "VALIDATION_FAILED", "message": "Invalid input" }
```

### 401 Unauthorized
```json
{ "error": "UNAUTHORIZED", "message": "Authentication required" }
```

### 403 Forbidden
```json
{ "error": "FORBIDDEN", "message": "Admin access required" }
```

### 404 Not Found
```json
{ "error": "NOT_FOUND", "message": "Resource not found" }
```

### 429 Too Many Requests
```json
{ "error": "RATE_LIMITED", "message": "Rate limit exceeded", "retryAfter": 60 }
```

### 500 Internal Server Error
```json
{ "error": "INTERNAL_ERROR", "message": "An unexpected error occurred" }
```

## Rate Limits

- Global: 120 requests per minute per IP
- User-specific limits depend on plan

## CORS

Configure allowed origins via `ALLOWED_ORIGINS` environment variable.

```
ALLOWED_ORIGINS=https://your-domain.com,https://app.warpcast.com
```
