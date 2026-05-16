# 08_DATABASE_STATUS.md

## Status: ✅ Schema Complete | ✅ Migrations Ready | ⚠️ Redis External Not Active

## Evidence

| File | Status |
|------|--------|
| `packages/db/src/schema.ts` | ✅ Prisma schema, all tables defined |
| `packages/db/prisma/migrations/` | ✅ All migrations present |
| `packages/db/src/index.ts` | ✅ `getDB()`, `pingDB()` |
| `apps/api/src/server.ts` | ✅ DB connection on startup |

## Tables

| Table | Status |
|-------|--------|
| `users` | ✅ FID, username, plan, status |
| `casts` | ✅ cast_hash, author_fid, text, parent_hash |
| `alerts` | ✅ User alerts with type/risk_level |
| `alert_deliveries` | ✅ Delivery status tracking |
| `truth_checks` | ✅ Claim, verdict, evidence, risk_level |
| `radar_trends` | ✅ Trend with velocity, admin_status |
| `radar_trend_sources` | ✅ Per-cast trend sources |
| `agent_events` | ✅ Event log for agent runs |
| `agent_runs` | ✅ Provider, promptVersion, fallbackHistory |
| `reply_drafts` | ✅ Draft status, score, metadata |
| `user_preferences` | ✅ Per-user settings |
| `rate_limit_events` | ✅ Per-FID usage tracking |
| `admin_audit_logs` | ✅ Admin action audit trail |

## Working Pieces

- `npx prisma migrate deploy` — runs all pending migrations
- DB connection pool with health check
- All relations defined (user_id, cast_hash, etc.)
- Indexes on query-heavy fields (fid, cast_hash, status)

## Mocked Pieces

- Redis budget storage exists (`packages/llm/src/budget-redis.ts`) but `InMemoryBudgetStorage` is default

## Blockers

None. Database fully operational.

## Risks

1. **Redis budget** — `RedisBudgetStorage` not active by default; daily budget resets on API restart
2. **Migration ordering** — ensure `migrate deploy` runs before API starts in production
3. **Connection pool** — default pool size may be too small under high load; `DATABASE_URL` supports connection string options

## Commands

```bash
# Run migrations
docker compose exec api npx prisma migrate deploy

# Check migration status
docker compose exec api npx prisma migrate status

# Connect to DB
docker compose exec postgres psql -U pulo -d pulo_dev

# View schema
docker compose exec api npx prisma db pull --print
```