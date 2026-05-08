# Audit Logs

Audit logs track administrative actions for compliance, debugging, and security review.

## Tracked Actions

| Action | Description |
|--------|-------------|
| `ERROR_RETRY` | Admin retried a failed error |
| `JOB_RETRY` | Admin retried a failed job |
| `JOB_CANCEL` | Admin cancelled a running job |
| `PLAN_CHANGE` | Admin changed a user's plan tier |
| `TRUTH_CHECK_APPROVE` | Admin approved/overruled a truth check |
| `TREND_APPROVE` | Admin approved a trend for tracking |
| `SAFETY_FLAG_RESOLVE` | Admin resolved a safety flag |
| `USER_CREATE` | Admin created a new user |
| `USER_DELETE` | Admin deleted a user |
| `SETTINGS_CHANGE` | Admin changed system settings |
| `ADMIN_LOGIN` | Admin logged into admin panel |
| `ADMIN_LOGOUT` | Admin logged out of admin panel |

## Audit Event Structure

```typescript
interface AuditEvent {
  id: string;                    // Unique audit ID (audit_<timestamp>_<random>)
  timestamp: string;             // ISO 8601 timestamp
  action: AuditAction;           // One of the action types above
  actorFid: number;              // FID of the admin who performed the action
  actorType: 'admin' | 'system'; // Whether action was by human or automated system
  targetType?: string;           // Type of entity affected (e.g., 'error', 'user')
  targetId?: string;             // ID of the entity affected
  metadata?: Record<string, unknown>; // Additional context about the action
  correlationId?: string;        // Correlation ID for tracing related events
  ipAddress?: string;            // IP address of the request origin
}
```

## Log Functions

```typescript
import {
  logAuditEvent,
  logErrorRetry,
  logJobRetry,
  logPlanChange,
  getAuditStore,
} from '@pulo/observability';

// Generic audit event
await logAuditEvent({
  action: 'ERROR_RETRY',
  actorFid: 123,
  targetType: 'error',
  targetId: 'err_456',
  metadata: { errorCode: 'LLM_TIMEOUT' },
  correlationId: 'corr_789',
});

// Pre-built helpers
await logErrorRetry({
  actorFid: 123,
  errorId: 'err_456',
  errorCode: 'LLM_TIMEOUT',
  correlationId: 'corr_123',
});

await logJobRetry({
  actorFid: 123,
  jobId: 'job_789',
  jobType: 'cast_publish',
});

await logPlanChange({
  actorFid: 123,
  targetFid: 456,
  oldPlan: 'free',
  newPlan: 'pro',
});

// Query audit store
const store = getAuditStore();

// Get recent events
const recent = await store.recent(100);

// Find by filter
const errors = await store.findAll({ action: 'ERROR_RETRY' });
const byActor = await store.findAll({ actorFid: 123 });

// Count events
const total = await store.count();
const errorCount = await store.count({ action: 'ERROR_RETRY' });
```

## Structured Logging

Audit events are also emitted as Pino structured logs:

```json
{
  "level": "info",
  "time": "2026-05-08T12:00:00.000Z",
  "service": "pulo",
  "component": "audit",
  "auditId": "audit_1778232482648_gvdzgp",
  "action": "ERROR_RETRY",
  "actorFid": 123,
  "actorType": "admin",
  "targetType": "error",
  "targetId": "err_123",
  "msg": "Audit event: ERROR_RETRY"
}
```

## Retention

- In-memory audit store retains up to 10,000 events
- Events are trimmed FIFO when the limit is exceeded
- For production, consider writing to a persistent store (database, Elasticsearch, etc.)