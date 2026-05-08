# Error Taxonomy

PULO uses a typed error system with 16 error codes organized by category.

## Error Codes

### Far caster Errors (1xxx)

| Code | Name | Retryable | Max Attempts | Description |
|------|------|-----------|-------------|-------------|
| `FARCASTER_WEBHOOK_INVALID` | Invalid Webhook | No | 2 | Webhook payload validation failed |
| `FARCASTER_CAST_FETCH_FAILED` | Cast Fetch Failed | Yes | 3 | Could not fetch cast from Warpcast |
| `FARCASTER_PUBLISH_FAILED` | Publish Failed | Yes | 3 | Failed to publish cast to Warpcast |
| `FARCASTER_RATE_LIMITED` | Rate Limited | Yes | 5 | Warpcast API rate limit hit |

### LLM Errors (2xxx)

| Code | Name | Retryable | Max Attempts | Description |
|------|------|-----------|-------------|-------------|
| `LLM_TIMEOUT` | LLM Timeout | Yes | 2 | LLM request timed out |
| `LLM_INVALID_JSON` | Invalid JSON | No | 1 | LLM returned malformed JSON |
| `LLM_BUDGET_EXCEEDED` | Budget Exceeded | No | 0 | LLM budget/quota exceeded |

### Safety/Plan Errors (3xxx)

| Code | Name | Retryable | Max Attempts | Description |
|------|------|-----------|-------------|-------------|
| `SAFETY_BLOCKED` | Safety Blocked | No | 0 | Content blocked by safety check |
| `PLAN_LIMIT_EXCEEDED` | Limit Exceeded | No | 0 | User plan limit reached |
| `DUPLICATE_EVENT` | Duplicate Event | No | 0 | Duplicate event detected |

### Alert/Notification Errors (4xxx)

| Code | Name | Retryable | Max Attempts | Description |
|------|------|-----------|-------------|-------------|
| `ALERT_CONSENT_MISSING` | Consent Missing | No | 0 | User has not consented to alerts |
| `DIRECT_CAST_FAILED` | Direct Cast Failed | Yes | 3 | Direct cast notification failed |

### Infrastructure Errors (5xxx)

| Code | Name | Retryable | Max Attempts | Description |
|------|------|-----------|-------------|-------------|
| `DB_ERROR` | Database Error | Yes | 3 | Database operation failed |
| `REDIS_ERROR` | Redis Error | Yes | 3 | Redis operation failed |

### Catch-all

| Code | Name | Retryable | Max Attempts | Description |
|------|------|-----------|-------------|-------------|
| `UNKNOWN_ERROR` | Unknown Error | Yes | 1 | Unexpected error |

## Error Categories

```typescript
type ErrorCategory =
  | 'FARCASTER'  // Far caster API errors
  | 'LLM'        // LLM service errors
  | 'SAFETY'     // Safety system errors
  | 'PLAN'       // Subscription/plan errors
  | 'ALERT'      // Notification errors
  | 'INFRA'      // Infrastructure errors
  | 'UNKNOWN';   // Unclassified
```

## Error Status

```typescript
type ErrorStatus =
  | 'pending'       // Awaiting retry
  | 'retrying'       // Currently retrying
  | 'resolved'       // Successfully resolved
  | 'dead_lettered'; // Moved to DLQ
```

## Creating Errors

```typescript
import { createError, errors } from '@pulo/errors';

// Using factory
const error = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Cast hash not found', {
  metadata: { castHash: '0x123' },
  jobId: 'job_456',
});

// Using helpers
const error = errors.farcasterPublishFailed(originalError, { castHash: '0x123' });
```

## Error JSON Serialization

```typescript
const json = error.toJSON();
// {
//   id: 'corr_123_abc',
//   code: 'FARCASTER_PUBLISH_FAILED',
//   category: 'FARCASTER',
//   message: 'Cast hash not found',
//   retryable: true,
//   retryCount: 0,
//   correlationId: 'corr_123_abc',
//   jobId: 'job_456',
//   metadata: { castHash: '0x123' },
//   timestamp: '2026-05-08T12:00:00.000Z',
//   cause: 'Original error message'
// }
```