# Health Checks

## Overview

PULO exposes health check endpoints across the API and Worker services for load balancer probes, orchestration dashboards, and deployment readiness verification.

## API Health Endpoints

Base URL: `http://localhost:4311`

### GET /health

Basic liveness check. Returns `200 OK` when the API process is running.

```json
{
  "status": "ok",
  "service": "pulo-api",
  "timestamp": "2026-05-16T15:00:00.000Z",
  "env": "development",
  "mode": "mock"
}
```

### GET /health/live

Kubernetes-compatible liveness probe. Returns `200 OK` if the process is alive, regardless of dependencies.

```json
{
  "status": "ok",
  "timestamp": "2026-05-16T15:00:00.000Z"
}
```

### GET /health/ready

Readiness probe — checks that all dependencies (DB, Redis) are reachable. Returns `200 OK` when ready, `503 Service Unavailable` when not.

```json
{
  "status": "ready",
  "timestamp": "2026-05-16T15:00:00.000Z",
  "checks": [
    { "component": "database", "status": "ok", "latencyMs": 12 },
    { "component": "redis", "status": "ok", "latencyMs": 8 }
  ]
}
```

When any check fails:
```json
{
  "status": "not_ready",
  "timestamp": "2026-05-16T15:00:00.000Z",
  "checks": [
    { "component": "database", "status": "ok", "latencyMs": 12 },
    { "component": "redis", "status": "error", "latencyMs": 5001, "message": "Connection refused" }
  ]
}
```

### GET /health/deep

Deep health check — includes all component statuses, provider mode diagnostics, system resources, and queue depth. No secrets exposed.

```json
{
  "status": "ok",
  "timestamp": "2026-05-16T15:00:00.000Z",
  "uptime": 3600,
  "checks": [
    { "component": "api", "status": "ok", "latencyMs": 0, "details": { "version": "0.1.0", "nodeVersion": "v22.13.10" } },
    { "component": "database", "status": "ok", "latencyMs": 12, "details": { "type": "postgres", "poolSize": 10, "availableConnections": 8 } },
    { "component": "redis", "status": "ok", "latencyMs": 8, "details": { "memoryUsedMb": 67, "connectedClients": 8 } },
    { "component": "farcaster", "status": "ok", "details": { "mode": "mock", "isHealthy": true, "errors": [] } },
    { "component": "llm", "status": "ok", "details": { "mode": "mock", "isHealthy": true } },
    { "component": "queue", "status": "ok", "details": { "pendingJobs": 0, "runningJobs": 0, "queueDepth": 0 } },
    { "component": "system", "status": "ok", "details": { "memoryUsedMb": 128, "memoryTotalMb": 512, "cpuUserMs": 5000, "cpuSystemMs": 1200, "pid": 1234 } }
  ],
  "metrics": { ... }
}
```

## Worker Health Endpoints

Base URL: `http://localhost:4312`

### GET /health/live

Liveness probe for the worker process.

```json
{
  "status": "ok",
  "timestamp": "2026-05-16T15:00:00.000Z"
}
```

### GET /health/ready

Readiness probe for the worker. Checks Redis connectivity (used by BullMQ).

```json
{
  "status": "ready",
  "timestamp": "2026-05-16T15:00:00.000Z",
  "checks": [
    { "component": "redis", "status": "ok", "latencyMs": 8 }
  ]
}
```

### GET /

Worker root — returns basic status.

```json
{
  "status": "ok",
  "service": "pulo-worker"
}
```

## Health Check Response Codes

| Endpoint | Healthy | Degraded | Unhealthy |
|----------|---------|----------|-----------|
| `GET /health` | 200 | — | — |
| `GET /health/live` | 200 | — | — |
| `GET /health/ready` | 200 | — | 503 |
| `GET /health/deep` | 200 | 503 | 503 |

## Dependency Checks

| Component | Check Method | Timeout |
|-----------|-------------|---------|
| PostgreSQL | `pingDB()` — executes `SELECT 1` | 10s (process default) |
| Redis | `ioredis.ping()` | 5s |
| Queue (BullMQ) | Job event listeners | N/A (event-driven) |

## Provider Mode Health

`/health/deep` includes `diagnoseModes()` output for `farcaster` and `llm` components. No API keys or secrets are exposed — only the mode name and `isHealthy` boolean.

## Docker Health Checks

```yaml
# docker-compose.yml example
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:4311/health/ready"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

## Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 4311
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 4311
  initialDelaySeconds: 10
  periodSeconds: 5
```