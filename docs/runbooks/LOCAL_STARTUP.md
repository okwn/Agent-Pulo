# Local Startup Runbook

Steps to start PULO stack locally.

## Pre-flight Checklist

1. Docker daemon running: `docker ps`
2. Ports available: `pnpm doctor`
3. `.env` exists with required variables
4. `node_modules` installed: `ls node_modules | head -5`

## Startup Sequence

### 1. Detect Ports

```bash
node scripts/print-ports.mjs
```

This checks preferred ports and finds alternatives if needed. Output shows final port mapping.

### 2. Start Stack

```bash
pnpm dev:local
```

This will:
- Stop any existing pulo containers
- Detect port conflicts
- Write `.env.local.generated` with detected ports
- Build Docker images
- Start all services
- Wait for health checks

### 3. Verify

```bash
pnpm doctor
```

Check:
- All containers running (`docker ps`)
- API health: `curl http://localhost:4311/health`
- Web accessible: `curl http://localhost:3000`

## Service URLs

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4311 |
| API Health | http://localhost:4311/health |
| Deep Health | http://localhost:4311/health/deep |
| Metrics | http://localhost:4311/metrics |

## Common Issues

### "Cannot connect to database"

Wait 10 seconds for postgres to initialize. If persists:
```bash
docker exec -it pulo_postgres psql -U pulo -d pulo_dev -c "SELECT 1"
```

### "Port already in use"

Other process using the port. Scripts find alternatives automatically. Check `.env.local.generated`.

### "Build failed"

Clear Docker cache and rebuild:
```bash
docker builder prune -af
pnpm dev:local
```

### "Health checks failing"

Check logs:
```bash
pnpm docker:logs
docker logs pulo_api --tail 50
```

## Shutdown

```bash
pnpm docker:down
```

For full cleanup (removes data):
```bash
pnpm docker:down --clean
docker volume rm pulo_postgres_data
```