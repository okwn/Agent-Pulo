# LOGGING_AND_METRICS.md

## Logging Strategy

**Library:** Pino (structured JSON logging for production, pretty-print for dev)

**Log Levels:**
- `fatal` — Process crash, unrecoverable
- `error` — Recoverable error, requires attention
- `warn` — Degraded state, self-healing
- `info` — Normal operation events
- `debug` — Detailed debugging (dev only)

**Structured Fields (always present):**
```json
{
  "timestamp": "2026-05-07T22:30:00.000Z",
  "level": "info",
  "service": "pulo-api",
  "jobId": "uuid",
  "fid": 12345,
  "msg": "Job enqueued"
}
```

**Request Correlation:** Every request gets a `requestId` propagated through all services.

## Metrics (Prometheus-compatible)

| Metric | Type | Description |
|---|---|---|
| `pulo_jobs_total` | Counter | Total jobs processed by type |
| `pulo_job_duration_seconds` | Histogram | Job processing time |
| `pulo_llm_calls_total` | Counter | LLM API calls by model |
| `pulo_llm_errors_total` | Counter | LLM errors by type |
| `pulo_rate_limit_hits_total` | Counter | Rate limit activations |
| `pulo_active_jobs` | Gauge | Currently processing jobs |
| `pulo_queue_depth` | Gauge | Jobs waiting in queue |

**Metrics endpoint:** `GET /metrics` on worker health port (4312)

## Alerting Thresholds

| Condition | Severity | Action |
|---|---|---|
| Error rate > 5% | Warning | Log to Sentry |
| Error rate > 20% | Critical | Alert admin via DM |
| Queue depth > 500 | Warning | Scale workers |
| LLM latency > 10s | Warning | Check OpenAI status |
| Worker down | Critical | Restart worker; alert admin |

## Log Retention

- Local logs: 7 days (rolling)
- Postgres logs: 90 days
- Sentry: 30 days
- Cloud log sink (LogDNA): 90 days