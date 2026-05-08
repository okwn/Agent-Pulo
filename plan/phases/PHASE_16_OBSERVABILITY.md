# Phase 16: Observability

## Goal

Implement comprehensive observability for PULO:
- Metrics collection (webhook events, agent runs, LLM tokens, truth checks, etc.)
- Structured Pino logging with correlation IDs
- Audit logs for admin actions
- Prometheus-compatible /metrics endpoint
- Deep health check endpoint
- Admin system page
- Documentation

## What Was Implemented

### 1. Metrics Collection

**File**: `packages/observability/src/metrics.ts`

Metrics store with Prometheus-compatible output:

```typescript
export const METRIC_NAMES = {
  // Webhook events
  WEBHOOK_EVENTS_RECEIVED: 'pulo_webhook_events_received_total',
  EVENTS_PROCESSED: 'pulo_events_processed_total',
  EVENTS_PROCESSING_TIME_MS: 'pulo_events_processing_time_ms',
  // Agent runs
  AGENT_RUNS_TOTAL: 'pulo_agent_runs_total',
  AGENT_RUNS_DURATION_MS: 'pulo_agent_runs_duration_ms',
  // LLM
  LLM_TOKENS_USED: 'pulo_llm_tokens_used_total',
  LLM_COST_ESTIMATE_USD: 'pulo_llm_cost_estimate_usd_total',
  LLM_REQUESTS_TOTAL: 'pulo_llm_requests_total',
  // Truth checks
  TRUTH_CHECKS_TOTAL: 'pulo_truth_checks_total',
  TRUTH_CHECKS_BY_VERDICT: 'pulo_truth_checks_by_verdict_total',
  // Radar
  RADAR_TRENDS_DETECTED: 'pulo_radar_trends_detected_total',
  // Alerts
  ALERTS_DELIVERED: 'pulo_alerts_delivered_total',
  ALERT_FAILURES: 'pulo_alert_failures_total',
  DIRECT_CAST_ATTEMPTS: 'pulo_direct_cast_attempts_total',
  MINI_APP_NOTIFICATIONS: 'pulo_mini_app_notifications_total',
  // Safety/Plan
  SAFETY_BLOCKS: 'pulo_safety_blocks_total',
  PLAN_LIMIT_BLOCKS: 'pulo_plan_limit_blocks_total',
  // Publish
  PUBLISH_SUCCESS: 'pulo_publish_success_total',
  PUBLISH_FAILURE: 'pulo_publish_failure_total',
  // Queue
  QUEUE_DEPTH: 'pulo_queue_depth',
  QUEUE_PENDING_JOBS: 'pulo_queue_pending_jobs',
  QUEUE_RUNNING_JOBS: 'pulo_queue_running_jobs',
  // System
  SYSTEM_MEMORY_USAGE_BYTES: 'pulo_system_memory_usage_bytes',
  SYSTEM_CPU_USAGE: 'pulo_system_cpu_usage_percent',
} as const;
```

Functions:
- `incrementCounter(name, labels?, value?)` — increment a counter
- `recordHistogram(name, value, labels?)` — record a histogram observation
- `setGauge(name, value, labels?)` — set a gauge value
- `toPrometheusFormat()` — export in Prometheus text format
- `toSnapshot()` — export as JSON snapshot

### 2. Structured Logging

**File**: `packages/observability/src/index.ts`

Lazy-initialized Pino logger (circular dependency fix):

```typescript
let _log: pino.Logger | null = null;

function getLog(): pino.Logger {
  if (!_log) {
    _log = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
      base: {
        service: process.env.PULO_SERVICE_NAME ?? 'pulo',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }
  return _log;
}

export const log = {
  info: (...args: unknown[]) => getLog().info(...args),
  error: (...args: unknown[]) => getLog().error(...args),
  warn: (...args: unknown[]) => getLog().warn(...args),
  debug: (...args: unknown[]) => getLog().debug(...args),
  child: (bindings: pino.Bindings) => getLog().child(bindings),
};
```

### 3. Tracing

**File**: `packages/observability/src/tracing.ts`

- `generateRequestId()` — `req_${timestamp}_${uuid}`
- `generateCorrelationId()` — `corr_${timestamp}_${uuid}`
- `generateJobId()` — `job_${timestamp}_${uuid}`
- `generateAgentRunId()` — `run_${timestamp}_${uuid}`
- `SpanTracker` — tracks spans for distributed tracing
- `RequestContext` — request-level context storage

### 4. Audit Logging

**File**: `packages/observability/src/audit.ts`

In-memory audit store with structured events:

```typescript
export type AuditAction =
  | 'ERROR_RETRY'
  | 'JOB_RETRY'
  | 'JOB_CANCEL'
  | 'PLAN_CHANGE'
  | 'TRUTH_CHECK_APPROVE'
  | 'TREND_APPROVE'
  | 'SAFETY_FLAG_RESOLVE'
  | 'USER_CREATE'
  | 'USER_DELETE'
  | 'SETTINGS_CHANGE'
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT';

export async function logAuditEvent(params: {
  action: AuditAction;
  actorFid: number;
  actorType?: 'admin' | 'system';
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  ipAddress?: string;
}): Promise<string>
```

Pre-defined functions:
- `logErrorRetry(params)` — log error retry action
- `logJobRetry(params)` — log job retry action
- `logPlanChange(params)` — log plan change
- `logTruthCheckApprove(params)` — log truth check approval
- `logTrendApprove(params)` — log trend approval
- `logSafetyFlagResolve(params)` — log safety flag resolution

### 5. Metrics Endpoint

**File**: `apps/api/src/routes/observability.ts`

```
GET /metrics?format=prometheus  → text/plain; version=0.0.4
GET /metrics?format=json        → application/json
GET /health/deep                → full health check with component status
GET /health/audit               → recent audit events
```

### 6. Deep Health Check

**File**: `apps/api/src/routes/observability.ts`

`/health/deep` returns status for:
- `api` — self check with version, node version
- `database` — PostgreSQL connection status
- `redis` — Redis connection status
- `farcaster` — Far caster API rate limit
- `llm` — LLM quota and model
- `queue` — pending/running jobs
- `system` — memory, CPU, PID

### 7. Admin System Page

**File**: `apps/web/src/app/(admin)/admin/system/page.tsx`

Shows:
- System health status with component-level checks
- Metrics snapshot (counters, gauges)
- Recent audit events
- Uptime, memory usage

### 8. API Routes

**File**: `apps/api/src/routes/observability.ts`

```
GET /metrics          → Prometheus metrics output
GET /health/deep      → Deep health check
GET /health/audit     → Recent audit events
```

**File**: `apps/api/src/routes/admin.ts`

Admin routes with audit logging:
```
GET  /api/admin/errors           → List errors
POST /api/admin/errors/:id/retry → Retry error (audit logged)
GET  /api/admin/jobs            → List jobs
POST /api/admin/jobs/:id/cancel → Cancel job (audit logged)
GET  /api/admin/dead-letter     → Dead letter queue
POST /api/admin/dead-letter/:id/retry → Retry from dead letter
```

## Files Created

| File | Purpose |
|------|---------|
| `packages/observability/src/index.ts` | Main export, lazy Pino logger |
| `packages/observability/src/metrics.ts` | Metrics store, Prometheus export |
| `packages/observability/src/audit.ts` | Audit logging with pre-defined events |
| `packages/observability/src/tracing.ts` | Request tracing, correlation IDs |
| `packages/observability/src/types.ts` | Shared types |
| `apps/api/src/routes/observability.ts` | /metrics, /health/deep endpoints |
| `apps/web/src/app/(admin)/admin/system/page.tsx` | Admin system page |
| `docs/observability/OBSERVABILITY.md` | Overview documentation |
| `docs/observability/METRICS.md` | Metrics reference |
| `docs/observability/AUDIT.md` | Audit logging guide |
| `docs/observability/HEALTH_CHECKS.md` | Health check endpoints |
| `plan/phases/PHASE_16_OBSERVABILITY.md` | This file |

## Files Modified

| File | Changes |
|------|---------|
| `apps/api/src/server.ts` | Registered observability routes, added correlation ID hook |
| `apps/api/src/routes/admin.ts` | Added audit logging to admin actions |
| `packages/observability/package.json` | Added pino, pino-http dependencies |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `PULO_SERVICE_NAME` | `pulo` | Service name for log base |
| `METRICS_ENABLED` | `true` | Enable metrics collection |

## Tests

| File | Coverage |
|------|----------|
| `packages/observability/src/index.test.ts` | Logger lazy init, child logger |
| `packages/observability/src/metrics.test.ts` | Counter/histogram/gauge, Prometheus format |

## Security Checklist

- [x] No secrets in logs
- [x] Correlation IDs for request tracing
- [x] Audit logs for admin actions
- [x] Health endpoint doesn't expose internal details

## Next Steps

Potential enhancements:
- Add metrics persistence (Redis or time-series DB)
- Add distributed tracing (OpenTelemetry)
- Add log aggregation (LogDNA, Datadog)
- Add alert rules based on metrics
