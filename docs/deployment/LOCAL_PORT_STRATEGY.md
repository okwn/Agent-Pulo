# LOCAL_PORT_STRATEGY.md

## Overview

Services bind to ports from environment variables. Defaults are chosen to avoid conflicts with common development tools.

## Default Ports

| Service | Env Var | Default | Range |
|---|---|---|---|
| Web (Next.js) | PULO_WEB_PORT | 4310 | 43100–43199 |
| API (Fastify) | PULO_API_PORT | 4311 | 43110–43199 |
| Worker Health | PULO_WORKER_PORT | 4312 | 43120–43199 |
| Postgres | PULO_POSTGRES_PORT | 5544 | 55440–55499 |
| Redis | PULO_REDIS_PORT | 6388 | 63880–63899 |

## Port Resolution at Startup

1. Read `PULO_*_PORT` env var if set; otherwise use default
2. Attempt to bind to resolved port
3. If port is occupied and the service has a fallback range, scan the range
4. If no free port found, exit with fatal error

## Discovery Script

`scripts/find-free-port.mjs` can be called by startup scripts to discover ports before binding. It outputs JSON:

```json
{"requested":4311,"found":4311,"rangeStart":43110,"rangeEnd":43199}
```

## Docker / Compose

In `infra/docker/docker-compose.yml`, host ports are mapped from env vars:

```yaml
ports:
  - "${PULO_POSTGRES_PORT:-5544}:5432"
```

Container-internal communication uses internal container ports (5432 for postgres, 6379 for redis), not the host-mapped ports.

## No Hardcoded Ports

Ports must never be hardcoded in source code. All port values come from:
1. Environment variable `PULO_*_PORT`
2. Or a fallback default in `packages/shared/src/index.ts`

## Verification

On startup, each service logs its bound port:

```
[api] Server listening on 0.0.0.0:4311
[web] Ready on http://localhost:4310
[worker] Health check on http://localhost:4312
```

If a different port was chosen (e.g., due to conflict), the log reflects the actual port.