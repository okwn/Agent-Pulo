# Port Conflict Resolution

PULO automatically handles port conflicts by finding free alternatives.

## How It Works

1. **Preferred ports** read from environment variables or defaults
2. **Occupied check** uses Node.js `net.createServer().listen()` attempt
3. **Free port search** scans up to 100 ports above preferred
4. **Config generation** writes detected ports to `.env.local.generated`
5. **Docker compose** reads detected ports from generated env

## Preferred Ports

| Service | Variable | Default |
|---------|----------|---------|
| API | `PULO_API_PORT` | 4311 |
| Web | `PULO_WEB_PORT` | 3000 |
| Worker | `PULO_WORKER_PORT` | 4321 |
| Postgres | `PULO_POSTGRES_PORT` | 5432 |
| Redis | `PULO_REDIS_PORT` | 6379 |

## Manual Override

Set preferred ports in `.env`:

```
PULO_API_PORT=5311
PULO_WEB_PORT=4000
PULO_POSTGRES_PORT=6543
PULO_REDIS_PORT=7379
```

## Finding What's Using a Port

```bash
# Linux
lsof -i :4311
ss -tlnp | grep 4311

# macOS
lsof -i :4311
```

## Common Conflicts

### Another dev server

Stop your running `next dev` or `fastify` processes:
```bash
pkill -f "next dev"
pkill -f "node.*api"
```

### Docker desktop

Docker Desktop reserves some ports. Use alternatives (5433, 6379).

### PostgreSQL installed locally

Either:
- Stop local postgres: `brew services stop postgresql`
- Or use alternate port in `.env`: `PULO_POSTGRES_PORT=6543`

### Redis installed locally

Either:
- Stop local redis: `brew services stop redis`
- Or use alternate port: `PULO_REDIS_PORT=7379`

## Verification

After starting, verify ports in:
1. `.env.local.generated` - detected ports
2. `docker compose ps` - running containers and their port mappings
3. `pnpm doctor` - port availability check

## No Port Touching

PULO scripts **never** kill existing processes. They only:
- Detect if a port is occupied
- Find an alternative free port
- Write config to `.env.local.generated`
- Log the conflict for awareness

If you need to forcefully free a port:
```bash
# Find PID using port
lsof -i :4311

# Kill the process (careful!)
kill <PID>
```