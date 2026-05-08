# Local Docker Development

Run PULO's full stack locally using Docker Compose.

## Prerequisites

- Docker >= 20.10
- Docker Compose >= 2.0 (or `docker compose` plugin)
- Node.js >= 20.12
- pnpm >= 9

## Quick Start

```bash
# First time setup
pnpm install

# Start the stack (detects free ports automatically)
pnpm dev:local

# Check stack health
pnpm doctor
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:local` | Start full stack with port detection |
| `pnpm docker:up` | Alias for dev:local |
| `pnpm docker:down` | Stop containers (keeps data) |
| `pnpm docker:logs` | Stream container logs |
| `pnpm doctor` | Verify stack health |

## Port Detection

The setup scripts automatically detect port conflicts:

1. Preferred ports are read from `.env` or defaults
2. If a preferred port is occupied, a free port nearby is found
3. Detected ports are written to `.env.local.generated`
4. Docker Compose uses these detected ports

Preferred defaults:
- API: `4311`
- Web: `3000`
- Worker: `4321`
- Postgres: `5432`
- Redis: `6379`

## Services

### API (`http://localhost:4311`)
Fastify-based REST API. Endpoints:
- `GET /health` - Basic health check
- `GET /health/deep` - Deep health with component status
- `GET /metrics` - Prometheus metrics

### Web (`http://localhost:3000`)
Next.js admin dashboard. Pages:
- `/admin/system` - System health and metrics
- `/admin/errors` - Error browser
- `/admin/jobs` - Job queue management

### Worker
Background job processor. Handles:
- Event processing
- Agent execution
- Alert delivery

### Postgres
PostgreSQL 16 with auto-initialized schema. Data persists in `postgres_data` volume.

### Redis
Redis 7 for caching and job queue.

## Data Persistence

Volumes:
- `postgres_data` - PostgreSQL data directory

To completely reset:
```bash
pnpm docker:down --clean
docker volume rm pulo_postgres_data
pnpm dev:local
```

## Logs

```bash
# All services
pnpm docker:logs

# Specific service
docker logs pulo_api -f
docker logs pulo_worker -f
```

## Troubleshooting

### Containers won't start

1. Check Docker is running: `docker ps`
2. Check ports: `pnpm doctor`
3. View logs: `pnpm docker:logs`
4. Rebuild: `docker compose build --no-cache`

### Port conflicts

The scripts automatically find free ports. Check `.env.local.generated` for detected ports.

### Database connection issues

1. Wait for postgres to be healthy (automatic)
2. Check `DATABASE_URL` in `.env.local.generated`
3. Connect manually: `psql postgres://pulo:pulo_dev_password@localhost:5432/pulo_dev`

## Development

### Hot reload

All services have volume mounts for hot reload:
- API/Worker: Mounts `/app` (source code)
- Web: Mounts `/app/apps/web` and `.next` cache

### Running locally without Docker

For API/Web development without Docker:
```bash
# Terminal 1: API
pnpm --filter @pulo/api dev

# Terminal 2: Web
pnpm --filter @pulo/web dev

# Terminal 3: Worker
pnpm --filter @pulo/worker dev
```

## Cleanup

```bash
# Stop and remove containers
pnpm docker:down

# Remove volumes (destroys data)
docker compose down -v

# Remove generated env
rm .env.local.generated
```