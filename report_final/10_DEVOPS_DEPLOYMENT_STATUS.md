# 10_DEVOPS_DEPLOYMENT_STATUS.md

## Status: ✅ Docker Multi-Container Ready | ✅ CI Pipeline Active | ⚠️ Backup Script Ready (Not Cron-Scheduled)

## Evidence

| File | Status |
|------|--------|
| `docker-compose.yml` | ✅ 4-service compose (postgres, redis, api, web), healthchecks |
| `infra/docker/api.Dockerfile` | ✅ 3-stage build (deps → builder → runner) |
| `infra/docker/web.Dockerfile` | ✅ 3-stage Next.js build |
| `infra/docker/worker.Dockerfile` | ✅ Worker container |
| `infra/docker/docker-compose.yml` | ✅ Local dev compose |
| `infra/backup/postgres-backup.sh` | ✅ Dry-run, retention, pre-flight checks |
| `infra/reverse-proxy/Caddyfile.example` | ✅ TLS, headers, 300s AI timeout |
| `infra/reverse-proxy/pulo.conf.example` | ✅ Nginx alternative |
| `.github/workflows/ci.yml` | ✅ pnpm install → typecheck → test → build → lint |

## Working Pieces

- `docker compose up -d` starts all 4 services with health checks
- PostgreSQL 16 Alpine with persistent `postgres_data` volume
- Redis 7 Alpine for session/cache
- API container: `pnpm --filter @pulo/api dev` on port 4311
- Web container: `pnpm --filter @pulo/web dev` on port 3100
- Worker container: `pnpm --filter @pulo/worker dev` on port 4321
- Healthcheck on all services (pg_isready, redis-cli ping, wget spider)
- CI pipeline: pnpm install → typecheck → test → build → lint
- Backup script: dry-run, 7-backup retention, pre-flight container check

## Mocked Pieces

- No actual backup cron job scheduled (script ready but not installed)
- No actual reverse proxy deployed (configs are examples)

## Live-Key-Required

| Item | Key | Notes |
|------|-----|-------|
| Farcaster live stream | `NEYNAR_API_KEY` | `PULO_FARCASTER_MODE=live` |
| LLM | `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` | `PULO_LLM_MODE=openai/anthropic/auto` |
| Deploy TLS | Valid domain + email | For Caddy Let's Encrypt |

## Blockers

None. Docker config fully operational.

## Risks

1. **Backup not cron-scheduled** — manual backup script run; automate with cron for production
2. **No log aggregation** — container logs go to `docker compose logs`; centralized logging recommended for production
3. **No container restart policy** — services won't auto-restart on host reboot; add `restart: unless-stopped`
4. **In-memory rate limit store** — `rateLimitStore` in security.ts resets on container restart; use Redis for production
5. **In-memory budget storage** — `InMemoryBudgetStorage` resets on API restart; set `PULO_BUDGET_STORAGE=redis`

## Commands

```bash
# Start all services
docker compose up -d

# Verify all healthy
docker compose ps

# View logs
docker compose logs -f api
docker compose logs -f web

# Backup database
./infra/backup/postgres-backup.sh pulo_postgres ./backups

# Dry-run backup (no changes)
./infra/backup/postgres-backup.sh --dry-run

# CI (runs on push/PR to main)
git push origin main

# Verify docker config valid
docker compose config

# TLS-ready reverse proxy
cp infra/reverse-proxy/Caddyfile.example Caddyfile
# Edit Caddyfile with your domain/email
docker compose -f infra/docker/docker-compose.yml up -d
```

## Recommended Fixes

```bash
# Add restart policies to docker-compose.yml
# In api/worker/web services, add:
restart: unless-stopped

# For production backup automation, add to crontab:
# 0 2 * * * cd /path/to/pulo && ./infra/backup/postgres-backup.sh pulo_postgres ./backups >> /var/log/pulo-backup.log 2>&1

# For Redis-backed rate limiting, set env:
PULO_BUDGET_STORAGE=redis
```