# DATABASE_DEBT.md

## Active Issues

### HIGH: `window` column name conflict
- **File:** `packages/db/src/schema.ts` + live DB
- **Issue:** `rate_limit_events` uses `window` column name but PostgreSQL treats `window` as a reserved keyword
- **DB column:** `window_start`
- **Schema column:** `window`
- **Fix:** Rename schema column to `windowStart` (camelCase) or `window_start` to match DB

### MEDIUM: drizzle-kit migrate fails with generated migration
- **Issue:** `drizzle-kit migrate` looks for a specific migration file (e.g. `0000_early_lord_hawal.sql`) that no longer exists after regeneration with new timestamp
- **Workaround:** Apply migrations via `psql -f` directly (used in Phase 02)
- **Fix:** Keep one canonical init migration file, use `drizzle-kit push` for dev schema changes

### MEDIUM: plan/subscription_tier enums inconsistent across packages
- **packages/db/schema.ts:** Uses `planEnum` with `['free', 'pro', 'team']` → updated to `['free', 'pro', 'creator', 'community', 'admin']`
- **packages/billing/src/index.ts:** Uses `PlanTier` enum with same values
- **apps/web/src/lib/mock-data.ts:** Defined `PlanTier = 'free' | 'pro' | 'team' | 'enterprise'` → updated to `'free' | 'pro' | 'creator' | 'community' | 'admin'`
- **Risk:** These must stay in sync or runtime type errors occur

### LOW: seed.ts uses raw SQL instead of Drizzle ORM
- **File:** `packages/db/src/seed.ts`
- **Issue:** Uses `postgres` driver directly, not the Drizzle ORM pattern used in repositories
- **Fix:** Convert to use repository layer once repositories are complete

### LOW: No migration journal tracking
- **Issue:** No `drizzle/migrations_meta/_journal.json` — prevents `drizzle-kit migrate` from tracking applied migrations
- **Fix:** Run `drizzle-kit generate` fresh to create journal, then apply all migrations

---

## Completed (Phase 02)

- ✅ 20 tables applied to local DB
- ✅ All required indexes created
- ✅ dedupeKey partial unique index on agent_events
- ✅ Seed data working
- ✅ Schema enums aligned with billing/web types