# Retry and Dead Letter Queue Runbook

This runbook describes how PULO handles failed operations through retry queues and dead letter queues.

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Failed Operation                           │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     AppError Created                             │
│  - Correlation ID assigned                                        │
│  - Error code categorized                                         │
│  - Retryable flag set                                             │
└─────────────────────────────┬────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
      ┌─────────────┐               ┌─────────────────┐
      │ Retryable?  │               │ Non-Retryable?  │
      └──────┬──────┘               └────────┬────────┘
             │                               │
             ▼                               ▼
      ┌─────────────────┐            ┌─────────────────┐
      │ Add to Retry    │            │ Add to Dead     │
      │ Queue          │            │ Letter Queue    │
      └─────────────────┘            └─────────────────┘
```

## Retry Queue

### Configuration

Each error code has a retry configuration:

```typescript
{
  maxAttempts: 3,      // Max retry attempts
  baseDelayMs: 2000,  // Initial delay
  maxDelayMs: 15000,  // Maximum delay cap
  strategy: 'exponential' | 'linear' | 'fixed',
  retryable: true | false,
}
```

### Retry Strategies

- **exponential**: Base delay × 2^attempt (e.g., 2s → 4s → 8s)
- **linear**: Base delay × attempt (e.g., 2s → 4s → 6s)
- **fixed**: Same delay every attempt (e.g., 2s → 2s → 2s)

### Retry Flow

1. Error occurs → AppError created with correlation ID
2. Error stored in InMemoryErrorStore with status `pending`
3. Job created in InMemoryRetryQueue
4. Background worker dequeues and processes
5. If successful → status `resolved`
6. If fails and attempts < max → status `retrying`, reschedule
7. If fails and attempts >= max → status `dead_lettered`, move to DLQ

### Admin Retry

Admins can manually retry errors from the UI or API:

```
POST /api/admin/errors/:id/retry
```

This:
1. Checks error is retryable
2. Creates new job with exponential backoff
3. Updates error status to `retrying`
4. Logs admin action: `[AUDIT] Admin {fid} retried error {id}`

### Job Retry

Similarly for failed jobs:

```
POST /api/admin/jobs/:id/retry
```

Creates a new job with same payload but fresh attempt counter.

## Dead Letter Queue

### When Errors Go to DLQ

Errors are dead-lettered when:
1. Non-retryable error occurs (SAFETY_BLOCKED, PLAN_LIMIT_EXCEEDED, etc.)
2. Retry attempts exhausted (retryCount >= maxAttempts)
3. Admin manually marks as dead letter

### DLQ Processing

Dead-lettered errors require human review:

1. Check error details in `/admin/errors?status=dead_lettered`
2. Review correlation ID and job context
3. Determine root cause
4. Fix underlying issue
5. Mark as resolved via UI or API

```typescript
POST /api/admin/errors/:id/resolve
```

### Common DLQ Scenarios

| Error Code | Likely Cause | Resolution |
|------------|--------------|------------|
| SAFETY_BLOCKED | Content policy violation | Review safety rules, modify content |
| PLAN_LIMIT_EXCEEDED | User hit plan quota | Upgrade user plan or wait for reset |
| LLM_BUDGET_EXCEEDED | OpenAI budget hit | Check billing, wait for reset |
| FARCASTER_RATE_LIMITED | Too many API calls | Wait for rate limit window, throttle |

## Monitoring

### Key Metrics

- `errors.pending` - Errors awaiting retry
- `errors.retrying` - Errors currently retrying
- `errors.resolved` - Successfully resolved errors
- `errors.deadLettered` - Errors in DLQ

Check via `/api/admin/health` and `/api/admin/stats`.

### Alerts

Alert when:
- Dead letter queue > 10 items
- Error rate (pending+retrying) > 50/minute
- Any INFRA error (DB, Redis)

## API Reference

### Error Endpoints

```
GET    /api/admin/errors              # List errors with filters
GET    /api/admin/errors/:id          # Get error detail
POST   /api/admin/errors/:id/retry    # Retry error
POST   /api/admin/errors/:id/resolve  # Mark resolved
```

### Job Endpoints

```
GET    /api/admin/jobs                # List jobs with filters
GET    /api/admin/jobs/:id           # Get job detail
POST   /api/admin/jobs/:id/retry     # Retry job
DELETE /api/admin/jobs/:id           # Cancel job
```

### Query Parameters

```
?code=FARCASTER_PUBLISH_FAILED     # Filter by error code
?category=FARCASTER                 # Filter by category
?status=pending                     # Filter by status
?retryable=true                     # Filter by retryable
&limit=50&offset=0                 # Pagination
```