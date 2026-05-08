# PULO Admin Guide

How to administer PULO.

## Accessing Admin Dashboard

Navigate to `http://localhost:4310/admin` (or your deployed URL).

Admin access requires:
- Demo cookie from `/admin/login`
- Or FID 1 in demo mode

## System Page

**URL**: `/admin/system`

Shows:
- Overall health status
- Per-component health (API, database, Redis, Far caster, LLM, queue)
- Metrics snapshot
- Recent audit events
- Uptime and resource usage

### Health Check Details

| Component | What's Checked |
|------------|----------------|
| API | Self-health, version, node version |
| Database | Postgres connection, pool size |
| Redis | Redis connection, memory, clients |
| Far caster | API rate limit remaining, mode |
| LLM | Quota remaining, model in use |
| Queue | Pending/running job counts |
| System | Memory usage, CPU time, PID |

## Error Management

**URL**: `/admin/errors`

### Viewing Errors

Lists all captured errors with:
- Error code and message
- Category (auth, validation, network, etc.)
- Count (how many times seen)
- First and last occurrence timestamps
- Correlation ID for tracing

### Retrying Errors

For retryable errors:
1. Find the error in the list
2. Click "Retry" button
3. Admin audit log records the retry

### Dead Letter Queue

Errors that exceed retry limits go to DLQ:
1. Navigate to `/admin/dead-letter`
2. View failed job details
3. Choose to retry or discard

## Job Management

**URL**: `/admin/jobs`

### Job States

- `pending` — Waiting to be processed
- `running` — Currently being processed
- `completed` — Successfully finished
- `failed` — Failed after all retries
- `cancelled` — Manually cancelled

### Managing Jobs

- **Cancel** — Stop a pending or running job
- **Retry** — Re-queue a failed job
- **View details** — See job input, output, error

## Demo Controls

**URL**: `/admin/demo`

### Available Actions

1. **Seed Demo Data** — Populates the system with demo scenarios
2. **Run Demo Scenarios** — Executes the demo scenarios
3. **Reset Demo** — Clears all demo data

### Demo Scenarios

Six pre-configured scenarios:
1. **Mention Summary** — User mentions the bot
2. **Truth Check** — Analyze a claim
3. **Radar Trend** — Show trend detection
4. **Scam Warning** — Demonstrate safety detection
5. **Composer** — Reply assistance
6. **Plan Limit** — Show plan limit enforcement

## Audit Logs

**URL**: `/admin/system` (scroll to audit section)

Shows recent admin actions:
- Error retries
- Job cancellations
- Plan changes
- Truth check approvals
- Trend approvals

Each entry includes:
- Timestamp
- Action type
- Actor (admin FID)
- Target (affected entity)
- IP address
- Correlation ID

## User Management

**URL**: `/admin/users`

Lists all known users (FID, username, plan).

### Plan Management

- View current plan (free/pro)
- Change plan
- View usage statistics
- Reset usage counters

## Alert Management

**URL**: `/admin/alerts`

View all configured alerts:
- Alert type (keyword, FID, cast hash)
- Alert parameters
- Delivery status
- Creation timestamp

## Technical Debt Tracking

**URL**: `/admin/technical-debt`

Lists known technical debt items:
- Description
- Severity
- Related files
- Planned fix

## Health Verification

To verify the system is healthy:

```bash
# Using curl
curl http://localhost:4311/health
curl http://localhost:4311/health/deep

# Using pnpm
pnpm doctor
```

Expected output from `/health/deep`:
```json
{
  "status": "ok",
  "timestamp": "2026-05-08T...",
  "checks": [
    { "component": "api", "status": "ok" },
    { "component": "database", "status": "ok" },
    ...
  ]
}
```

## CLI Commands

### Doctor
```bash
pnpm doctor
```
Verifies stack is healthy.

### Secret Scan
```bash
pnpm secret:scan
node scripts/secret-scanner.mjs
```
Checks for accidentally committed secrets.

### Demo Commands
```bash
pnpm demo:seed   # Seed demo data
pnpm demo:run    # Run demo scenarios
pnpm demo:reset  # Reset demo data
```

## Troubleshooting

### "Admin access required"

1. Log in at `/admin/login`
2. Or access from localhost with demo cookie

### Health check failing

1. Check all services are running: `docker compose ps`
2. Check logs: `docker compose logs`
3. Restart services: `docker compose restart`

### Metrics not updating

1. Check metrics endpoint: `curl localhost:4311/metrics`
2. Verify `METRICS_ENABLED=true`
3. Check for errors in logs
