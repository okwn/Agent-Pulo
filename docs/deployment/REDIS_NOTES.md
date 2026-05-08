# Redis Notes

Notes on Redis usage in PULO for caching and job queue.

## Connection

```bash
# Default local connection
redis://localhost:6379

# With password
redis://:password@localhost:6379

# Docker compose internal
redis://redis:6379
```

## What Redis Stores

### 1. Job Queue

PULO uses an in-memory job queue backed by Redis for distributed job processing:

- Pending jobs list
- Running jobs tracking
- Dead letter queue for failed jobs
- Job retry attempts

```typescript
// Redis keys used for queue
pulo:queue:pending    // List of pending job IDs
pulo:queue:running    // Hash of running job IDs to start times
pulo:queue:dead       // List of dead letter jobs
```

### 2. Rate Limiting

Per-IP rate limiting uses Redis for distributed counter:

```
pulo:ratelimit:{ip}:{minute}  // Request count
```

### 3. Caching

Optional caching layer for:
- Recent metrics snapshots
- Audit log cache
- Health check results cache

### 4. Session Data

Demo session cookies are verified against in-memory store (not Redis).

## Redis in Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "${PULO_REDIS_PORT:-6388}:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

## Persistence

Redis is configured with AOF (Append-Only File) persistence:

```
appendonly yes
appendfsync everysec
```

This provides:
- Crash recovery
- Sub-second data loss at worst
- Faster restarts

## Memory Management

Redis memory usage for PULO:

| Data | Approximate Size |
|------|-----------------|
| Queue (1000 jobs) | ~500 KB |
| Rate limit entries | ~100 KB per 1000 IPs |
| Cache (optional) | Variable |
| **Total** | **< 100 MB typical** |

## Health Check

```bash
# Check Redis is responding
docker compose exec redis redis-cli ping
# Expected: PONG

# View Redis info
docker compose exec redis redis-cli info

# Monitor commands in real-time
docker compose exec redis redis-cli monitor
```

## Troubleshooting

### "Redis connection refused"

1. Check Redis is running:
   ```bash
   docker compose ps redis
   ```

2. Check Redis logs:
   ```bash
   docker compose logs redis
   ```

3. Verify connection string in `REDIS_URL`

### "Out of memory"

Redis has `maxmemory` setting. Check:

```bash
docker compose exec redis redis-cli info memory
```

If Redis runs out of memory, it may start evicting keys. Check `maxmemory-policy`:

```
maxmemory-policy allkeys-lru
```

## Docker Exec Commands

```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# List all keys
redis-cli keys "pulo:*"

# Get queue depth
redis-cli llen pulo:queue:pending

# Clear all PULO keys (USE WITH CAUTION)
redis-cli keys "pulo:*" | xargs redis-cli del

# Get memory info
redis-cli info memory | grep used

# Get Redis config
redis-cli config get maxmemory
redis-cli config get maxmemory-policy
```

## Backup

Redis data is ephemeral by design (job queue state). For critical deployments:

### RDB Snapshot Backup

```bash
# Trigger background save
docker compose exec redis redis-cli bgsave

# Copy dump file
docker cp pulo_redis_1:/data/dump.rdb ./redis_backup.rdb
```

### AOF Backup

AOF file is at `/data/appendonly.aof`.

## Performance Tuning

For high-throughput deployments:

```bash
# In Redis config or docker command
redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --tcp-backlog 511
```

## Security

### No Authentication (Development)

```bash
REDIS_URL=redis://localhost:6379
```

### With Authentication

```bash
REDIS_URL=redis://:your_strong_password@localhost:6379
```

In docker-compose:
```yaml
redis:
  command: redis-server --requirepass your_strong_password
  environment:
    - REDIS_PASSWORD=your_strong_password
```

## Cluster Mode

PULO does not support Redis Cluster (single-node only).

For high availability, consider:
- Redis Sentinel
- External managed Redis (Redis Cloud, Upstash)
