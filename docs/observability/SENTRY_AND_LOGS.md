# SENTRY_AND_LOGS.md — Observability Configuration

## Sentry Integration (Optional)

Sentry is disabled by default. To enable, set `SENTRY_DSN` environment variable.

### API Server

```bash
# Install
pnpm --filter @pulo/api add @sentry/node

# In .env
SENTRY_DSN=https://example@sentry.io/project
NODE_ENV=production
```

Sentry captures:
- Unhandled exceptions in API routes
- Failed async jobs
- LLM parse errors (non-fatal)

### Web Frontend

```bash
# In web app
pnpm --filter pulo-web add @sentry/nextjs

# In .env.local
NEXT_PUBLIC_SENTRY_DSN=https://example@sentry.io/project
```

Sentry captures:
- Client-side exceptions
- Error boundary triggers
- Failed API calls

### Error Boundaries (Web)

The web app has an error boundary at `src/app/global-error.tsx`. It logs to console in dev and would send to Sentry in production if configured.

## Structured Log Drain

PULO uses Pino JSON logging. For production log aggregation:

### Datadog

```bash
# In docker-compose.yml environment
LOG_FORMAT=json
DD_API_KEY=your_datadog_key
```

### Grafana+Loki

```bash
# Promtail config (pulo-local/config/promtail.yml)
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: pulo
    static_configs:
      - targets: [localhost]
        labels:
          app: pulo
          env: production
        files:
          - /var/log/pulo/*.log
```

### CloudWatch

```bash
# Via awslogs agent
[python]
awslogs-group = /aws/pulo/api
awslogs-stream = api-$(hostname)
```

## Metrics Endpoint

`GET /metrics` returns Prometheus-format metrics. Scrape with:
- Prometheus: `prometheus.io/scrape: "true"`, `prometheus.io/port: "4311"`
- Grafana: Add Prometheus data source → import PULO dashboard

## Health Checks

| Check | Endpoint | When healthy |
|-------|----------|-------------|
| Basic | `GET /health` | Returns `{status:"ok"}` |
| Deep | `GET /health/deep` | All component checks pass |
| Metrics | `GET /metrics` | Prometheus parseable |

## Alerting (Prometheus+Alertmanager)

```yaml
# prometheus/rules/pulo-alerts.yml
groups:
  - name: pulo
    rules:
      - alert: PuloAPIHighErrorRate
        expr: rate(pulo_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PULO API error rate > 10%"

      - alert: PuloDeadLetterQueueGrowing
        expr: pulo_dead_letters > 100
        for: 5m
        labels:
          severity: warning
```

## Useful Grafana Queries

```promql
# Error rate
rate(pulo_errors_total[5m])

# Job throughput
rate(pulo_jobs_total[1m])

# P95 latency
histogram_quantile(0.95, rate(pulo_job_duration_seconds_bucket[5m]))

# LLM cost
rate(pulo_llm_cost_total[1h]) * 5  # assuming $5/hr budget
```