# Phase 17: Docker Local Environment

## Goal

Provide a Docker-based local development environment that:
- Starts all PULO services with one command
- Handles port conflicts gracefully (no process killing)
- Works reliably on developer machines
- Is documented and maintainable

## What Was Built

### Docker Compose Stack

```yaml
Services:
  - postgres (PostgreSQL 16)
  - redis (Redis 7)
  - api (Fastify API server)
  - worker (Background job processor)
  - web (Next.js admin dashboard)
```

Each service has:
- Health check (`pg_isready`, `redis-cli ping`, `wget /health`)
- Volume mounts for hot reload
- Environment from `.env` / `.env.local.generated`

### Dockerfiles

Three multi-stage Dockerfiles:
- `infra/docker/api.Dockerfile` - Node 20, pnpm, builds @pulo/api
- `infra/docker/web.Dockerfile` - Node 20, Next.js build, serves on port 3000
- `infra/docker/worker.Dockerfile` - Node 20, builds @pulo/worker

### Port Detection Scripts

`scripts/print-ports.mjs` - Standalone port checker:
- Loads `.env` for preferred ports
- Checks each port for availability
- Writes `.env.local.generated` with detected ports

`scripts/dev-up.mjs` - Full startup:
- Stops existing pulo containers (but never kills other processes)
- Runs port detection
- Builds Docker images
- Starts services with `docker compose up -d`
- Waits for health checks
- Prints final URLs

`scripts/dev-down.mjs` - Shutdown:
- Runs `docker compose down`
- Optionally removes `.env.local.generated`

### Doctor Script

`scripts/doctor.mjs` - Health verification:
- Checks Docker containers running
- Verifies ports in use (not available)
- Tests API `/health` endpoint
- Validates env files exist
- Checks node_modules and docker-compose.yml

## Key Design Decisions

### No Process Killing

Scripts detect port conflicts and find free alternatives. This avoids:
- Accidentally killing VS Code ports
- Developer rage when their other server gets killed
- Port conflicts with CI tools

### Generated Env File

`.env.local.generated` is written by scripts and contains:
- Detected port numbers
- Database credentials
- Redis URL

Never commit this file (it's in `.gitignore`).

### Health Checks

Each service has a health check:
- Postgres: `pg_isready`
- Redis: `redis-cli ping`
- API: `wget http://localhost:4311/health`
- Worker: `node -e "http.get(.../health)"`
- Web: `wget http://localhost:3000`

Docker waits for `service_healthy` before starting dependents.

## Package.json Scripts

```json
{
  "dev:local": "node scripts/dev-up.mjs",
  "docker:up": "node scripts/dev-up.mjs",
  "docker:down": "node scripts/dev-down.mjs",
  "docker:logs": "docker compose logs -f",
  "doctor": "node scripts/doctor.mjs"
}
```

## Development Workflow

1. Clone repo
2. Copy `.env.example` to `.env`, fill in secrets
3. `pnpm install`
4. `pnpm dev:local`
5. Open http://localhost:3000

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Port in use" | Scripts find alternatives, check `.env.local.generated` |
| "Build failed" | `docker builder prune -af && pnpm dev:local` |
| "Health check failing" | `pnpm docker:logs` to see service logs |
| "Can't connect to DB" | Wait 10s for postgres init, check `docker exec pulo_postgres psql...` |

## Future Enhancements

- [ ] Add `docker:restart` command
- [ ] Add `docker:rebuild` command
- [ ] Support `docker compose.override.yml` for local tweaks
- [ ] Add local HTTPS with mkcert
- [ ] Add service-specific logs (`pnpm docker:logs api`)
- [ ] Add seed data script for development
- [ ] Add metrics dashboard (Grafana?)

## Files Created

```
docker-compose.yml
infra/docker/api.Dockerfile
infra/docker/web.Dockerfile
infra/docker/worker.Dockerfile
infra/postgres/init.sql
scripts/dev-up.mjs
scripts/dev-down.mjs
scripts/print-ports.mjs
scripts/doctor.mjs (updated)
docs/deployment/LOCAL_DOCKER.md
docs/runbooks/LOCAL_STARTUP.md
docs/runbooks/PORT_CONFLICTS.md
plan/phases/PHASE_17_DOCKER_LOCAL.md
```