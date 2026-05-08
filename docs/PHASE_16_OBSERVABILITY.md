# Phase 16: Observability

## Overview

Phase 16 implements observability infrastructure for PULO: metrics, structured logging, audit logs, and tracing.

## Goals

1. **Metrics Tracking** - Track all important system events and behaviors
2. **Structured Logging** - Pino-based logging with correlation IDs
3. **Audit Logs** - Record admin actions for compliance and debugging
4. **Tracing** - Request/job/agent run ID tracking across services
5. **Prometheus-Compatible Endpoints** - No external dependency required

## Components

### @pulo/observability Package

```
packages/observability/
├── src/
│   ├── index.ts      # Exports and log singleton
│   ├── metrics.ts    # Counter, histogram, gauge tracking
│   ├── audit.ts      # Audit event logging
│   └── tracing.ts    # ID generation and span tracking
├── test/
│   └── observability.test.ts
└── package.json
```

### API Routes

- `GET /metrics` - Prometheus-format or JSON metrics
- `GET /health/deep` - Deep health check with component status

## Metrics Tracked

| Category | Metrics |
|----------|---------|
| Webhook | events received by channel |
| Agent | runs by type/status, duration |
| LLM | tokens, cost, requests by model |
| Truth | total checks, checks by verdict |
| Radar | trends detected by category |
| Alerts | delivered, failures by channel |
| Safety | blocks by reason |
| Publish | success/failure counts |
| Queue | depth, pending, running jobs |

## Structured Log Format

All logs use Pino with consistent fields:

```json
{
  "level": "info",
  "time": "2026-05-08T12:00:00.000Z",
  "service": "pulo",
  "component": "agent",
  "agentRunId": "run_...",
  "correlationId": "corr_...",
  "requestId": "req_...",
  "msg": "Human-readable message"
}
```

## Audit Actions

Tracked admin actions:
- ERROR_RETRY, JOB_RETRY, JOB_CANCEL
- PLAN_CHANGE
- TRUTH_CHECK_APPROVE, TREND_APPROVE
- SAFETY_FLAG_RESOLVE
- USER_CREATE, USER_DELETE
- SETTINGS_CHANGE
- ADMIN_LOGIN, ADMIN_LOGOUT

## Tracing IDs

- `req_<timestamp>_<random>` - Request ID
- `corr_<timestamp>_<random>` - Correlation ID
- `job_<timestamp>_<random>` - Job ID
- `run_<timestamp>_<random>` - Agent Run ID

## Health Check

`GET /health/deep` returns:

```json
{
  "status": "ok",
  "timestamp": "2026-05-08T12:00:00Z",
  "uptime": 3600,
  "checks": [
    {
      "component": "api",
      "status": "ok",
      "latencyMs": 5,
      "details": { "version": "0.1.0", "nodeVersion": "v20.0.0" }
    },
    {
      "component": "database",
      "status": "ok",
      "latencyMs": 12,
      "details": { "poolSize": 10, "availableConnections": 8 }
    },
    {
      "component": "redis",
      "status": "ok",
      "latencyMs": 3,
      "details": { "memoryUsedMb": 5, "connectedClients": 2 }
    },
    {
      "component": "farcaster",
      "status": "ok",
      "details": { "mode": "mock", "rateLimitRemaining": 10000 }
    },
    {
      "component": "llm",
      "status": "ok",
      "details": { "quotaRemaining": 100000, "model": "gpt-4o-mini" }
    },
    {
      "component": "system",
      "status": "ok",
      "details": { "memoryUsedMb": 50, "memoryTotalMb": 256, "pid": 1234 }
    }
  ],
  "metrics": { ... }
}
```

## Admin System Page

The admin system page (`/admin/system`) displays:

1. Overall health status badge
2. Service cards (API, Database, Redis, Far caster, LLM, System Resources)
3. Metrics summary cards (Agent Runs, Truth Checks, Alerts Sent, Publishes, Safety Blocks, Uptime)
4. Component details table with status, latency, and details

## No External Dependencies

- **No Prometheus server required** - Endpoint is Prometheus-compatible
- **No Elasticsearch required** - Logs go to stdout via Pino
- **No Jaeger/Zipkin required** - ID generation is self-contained

## Usage

### Recording Metrics

```typescript
import {
  incrementCounter,
  recordAgentRun,
  recordLLMUsage,
} from '@pulo/observability';

incrementCounter('my_counter');
incrementCounter('my_counter', { label: 'value' }, 5);

recordAgentRun('truth', 'completed', 1500);
recordLLMUsage(1000, 0.02, 'gpt-4o-mini');
```

### Logging

```typescript
import { log, createChildLogger } from '@pulo/observability';

log.info('Something happened');
log.error({ err }, 'Error occurred');

const agentLog = createChildLogger('agent');
agentLog.info({ agentRunId: 'run_123' }, 'Agent running');
```

### Audit Events

```typescript
import { logErrorRetry, logPlanChange } from '@pulo/observability';

await logErrorRetry({
  actorFid: 123,
  errorId: 'err_456',
  errorCode: 'LLM_TIMEOUT',
});

await logPlanChange({
  actorFid: 123,
  targetFid: 456,
  oldPlan: 'free',
  newPlan: 'pro',
});
```

## Testing

```bash
cd packages/observability
npm test
```

All 28 tests pass covering:
- Counter increments with labels and values
- Histogram observations
- Gauge updates
- Prometheus format generation
- JSON snapshot output
- Audit event logging
- Audit event filtering by action/actor
- ID generation (request, correlation, job, agent run)
- Request context creation from headers