# TECHNICAL_DEBT.md

## Known Issues

| Item | Description | Priority |
|---|---|---|
| No graceful shutdown | Worker doesn't drain queue on SIGTERM | High |
| LLM retry without backoff | Immediate retry floods API | High |
| No connection pooling | Postgres connections created per request | Medium |
| No request ID propagation | Logs cannot be correlated across services | Medium |
| Hard-coded rate limits | Values in code not env-configurable | Medium |
| No DB migrations tooling | Schema changes applied via Drizzle Kit | Low |
| No E2E tests | Only unit tests exist | Low |
| No Redis auth | Redis runs without password in local dev | Medium |
| Health checks are stubs | `/health/ready` doesn't probe DB/Redis | High |

## Architecture Debt

| Item | Description | Target Fix |
|---|---|---|
| Single-worker bottleneck | Only one worker process processes all jobs | Phase 3 |
| No message bus | Direct Redis pub/sub instead of proper bus | Phase 4 |
| Monolithic API server | All routes in single file | Phase 3 |
| No CDN for web assets | Static assets served from Next.js server | Phase 4 |

## Observability Debt

| Item | Description |
|---|---|
| No distributed tracing | Cannot trace request across API→Worker→DB |
| No metrics dashboard | Prometheus metrics exist but no Grafana |
| No alerting rules | Sentry only; no proactive alerting |

## Debt Resolution Principles

1. High-priority items must be resolved before Phase 3 (scale)
2. Medium items should be resolved during Phase 3 iteration
3. Low items backlogged to v2
4. All new code must not increase existing debt
5. PRs that increase debt must include fix in same PR or explicit ticket
6. New packages must have at least one passing test