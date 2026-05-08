# Correlation IDs

PULO uses correlation IDs to trace requests across all services and operations.

## Overview

A correlation ID (also known as trace ID or request ID) is:
- **Unique**: Each error/operation gets a unique ID
- **Propagated**: Child operations inherit parent's correlation ID
- **Logged**: Every log entry includes the correlation ID
- **Searchable**: Use correlation ID to find all related log entries

## Format

```
corr_{timestamp}_{random}
```

Example: `corr_1715163600000_a1b2c3d4`

## Usage in Code

### Creating Errors with Correlation ID

```typescript
import { createError, generateCorrelationId } from '@pulo/errors';

// Auto-generated
const error = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Failed');

// With custom correlation ID
const error = createError(ERROR_CODES.LLM_TIMEOUT, 'Timeout', {
  correlationId: 'corr_123_custom',
});

// Preserve parent correlation ID
const error = createError(ERROR_CODES.DIRECT_CAST_FAILED, 'Failed', {
  correlationId: parentCorrelationId,
});
```

### Propagating to Child Operations

```typescript
async function processCast(correlationId: string) {
  // Spawn child job with same correlation ID
  const job = await retryQueue.enqueue({
    type: 'process_cast',
    payload: { correlationId }, // Child inherits correlation ID
    // ...
  });
}
```

### Logging with Correlation ID

```typescript
// Every log should include correlation context
console.log({
  msg: 'Processing cast',
  correlationId: error.correlationId,
  jobId: job.id,
});

// Or use structured logger
logger.info('Processing cast', {
  correlationId: error.correlationId,
  jobId: job.id,
});
```

## Request ID Middleware

For incoming HTTP requests, a request ID is extracted from:

1. `X-Correlation-ID` header (if provided)
2. `X-Request-ID` header (if provided)
3. Generated fresh if neither present

This ID is then:
- Attached to request context
- Included in all log entries for that request
- Returned in response headers

## Traceability

With correlation IDs, you can trace a single user action across:

```
User casts "/pulo check this" →
Cast received by webhook (corr_123) →
Truth check job queued (corr_123) →
LLM call started (corr_123) →
LLM timeout error (corr_123) →
Error stored with corr_123 →
Admin sees error with corr_123 →
Admin retries, creates new job (corr_456) →
Job completes successfully (corr_456)
```

## Searching Logs

```bash
# Find all entries for a correlation ID
grep "corr_1715163600000_a1b2c3d4" logs/*.log

# In production with ELK/Grafana
correlationId:"corr_1715163600000_a1b2c3d4"
```

## Admin UI

The admin errors page shows correlation ID for each error:

```
┌────────────────┬─────────────────────────┬──────────────────────────────────┐
│ Error Code     │ Message                  │ Correlation ID                    │
├────────────────┼─────────────────────────┼──────────────────────────────────┤
│ LLM_TIMEOUT     │ Request timed out        │ corr_1715163600000_a1b2c3d4     │
│ FARCASTER_RATE  │ Rate limit exceeded      │ corr_1715163600001_c3d4e5f6     │
└────────────────┴─────────────────────────┴──────────────────────────────────┘
```

Click a correlation ID to see all related errors/jobs, or use it to search logs.

## Best Practices

1. **Always include correlation ID in errors** - Use `createError()` which auto-generates
2. **Propagate to child jobs** - Pass `correlationId` in job payload
3. **Log with context** - Include both `correlationId` and `jobId` in logs
4. **Return in responses** - Include correlation ID in error responses to client
5. **Use for debugging** - Always search by correlation ID first when investigating