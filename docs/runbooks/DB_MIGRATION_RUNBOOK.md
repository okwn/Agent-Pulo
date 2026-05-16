# DB Migration Runbook

## Prerequisites
- Docker running
- Database container: `pulo_postgres` on port 5432
- Connection: `postgresql://pulo:pulo_dev_password@localhost:5432/pulo_dev`

---

## Generate New Migration

```bash
cd packages/db
DATABASE_URL="postgresql://pulo:pulo_dev_password@localhost:5432/pulo_dev" pnpm db:generate
```

Migration file appears in `packages/db/migrations/`.

---

## Apply Migrations

### Via psql (recommended for dev)
```bash
cd packages/db
PGPASSWORD=pulo_dev_password psql -h localhost -p 5432 -U pulo -d pulo_dev -f migrations/MIGRATION_FILE.sql
```

### Via drizzle-kit migrate (requires meta/_journal.json)
```bash
cd packages/db
DATABASE_URL="postgresql://pulo:pulo_dev_password@localhost:5432/pulo_dev" pnpm db:migrate
```

---

## Seed Data

```bash
cd packages/db
DATABASE_URL="postgresql://pulo:pulo_dev_password@localhost:5432/pulo_dev" pnpm db:seed
```

Seed data: 4 users, 4 casts, 3 preferences, 3 agent events, 2 truth checks, 2 trends, 2 alerts, 2 alert deliveries.

---

## Full Reset (dev only)

```bash
# Drop all tables
PGPASSWORD=pulo_dev_password psql -h localhost -p 5432 -U pulo -d pulo_dev -c "
DROP TABLE IF EXISTS admin_audit_logs, agent_events, agent_runs, alert_deliveries, alerts,
  cast_threads, casts, radar_keywords, radar_trend_sources, radar_trends,
  radar_watched_channels, rate_limit_events, reply_drafts, safety_flags,
  subscriptions, trend_sources, trends, truth_checks, user_preferences, users CASCADE;
"

# Apply full schema
cd packages/db
PGPASSWORD=pulo_dev_password psql -h localhost -p 5432 -U pulo -d pulo_dev -f migrations/0001_init_pulo_schema.sql

# Seed
DATABASE_URL="postgresql://pulo:pulo_dev_password@localhost:5432/pulo_dev" pnpm db:seed
```

---

## Check Table List

```bash
PGPASSWORD=pulo_dev_password psql -h localhost -p 5432 -U pulo -d pulo_dev -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
```