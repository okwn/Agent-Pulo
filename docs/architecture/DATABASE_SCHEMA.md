# DATABASE_SCHEMA.md

**ORM:** Drizzle ORM + postgres driver  
**Port:** 5432 (docker compose `pulo_postgres`)  
**Database:** `pulo_dev` (user: `pulo`)

---

## Schema Overview — 20 Tables

| # | Table | Primary Key | Notes |
|---|-------|------------|-------|
| 1 | `users` | serial | `fid` UNIQUE |
| 2 | `user_preferences` | serial | FK→users(id), UNIQUE user_id |
| 3 | `subscriptions` | serial | FK→users(id) |
| 4 | `casts` | serial | `cast_hash` UNIQUE, indexes on author_fid, parent_hash |
| 5 | `cast_threads` | serial | `root_hash` UNIQUE |
| 6 | `agent_events` | uuid | FK→casts(cast_hash); partial unique dedupe_key |
| 7 | `agent_runs` | uuid | FK→users(id), FK→agent_events(id); token counts |
| 8 | `reply_drafts` | uuid | FK→users(id), FK→casts(cast_hash) |
| 9 | `truth_checks` | uuid | FK→casts(cast_hash), FK→users(id) |
| 10 | `trends` | uuid | keyword + status indexes |
| 11 | `trend_sources` | uuid | FK→trends(id), FK→casts(cast_hash) |
| 12 | `radar_trends` | uuid | admin_status + category indexes |
| 13 | `radar_trend_sources` | uuid | FK→radar_trends(id) |
| 14 | `radar_keywords` | uuid | `keyword` UNIQUE |
| 15 | `radar_watched_channels` | uuid | `channel_id` UNIQUE |
| 16 | `alerts` | uuid | FK→users(id); trend_id, truth_check_id nullable |
| 17 | `alert_deliveries` | uuid | FK→alerts(id), FK→users(id); composite user+trend idx |
| 18 | `admin_audit_logs` | uuid | actor FK→users(id) |
| 19 | `rate_limit_events` | uuid | composite (key, window_start) index |
| 20 | `safety_flags` | uuid | FK→casts(cast_hash), FK→users(id) |

---

## Enums

| Name | Values |
|------|--------|
| `plan` | free, pro, creator, community, admin |
| `user_status` | active, suspended, deactivated |
| `event_source` | webhook, worker, api, scheduler |
| `event_type` | mention, reply, dm, trend_detected, truth_check_request, alert_triggered, auto_reply |
| `event_status` | pending, processing, completed, failed, deduplicated |
| `run_status` | pending, running, completed, failed |
| `draft_status` | pending, approved, published, rejected |
| `verdict` | verified, likely_true, uncertain, likely_false, debunked |
| `risk_level` | low, medium, high, critical, unknown |
| `trend_category` | airdrop, grant, reward, token, program, governance, social |
| `trend_status` | active, fading, confirmed, debunked |
| `radar_trend_status` | detected, watching, approved, rejected, alerted, archived |
| `radar_category` | claim, reward_program, token_launch, airdrop, grant, hackathon, scam_warning, social_trend, unknown |
| `delivery_status` | pending, sent, delivered, opened, failed |
| `delivery_channel` | dm, cast_reply, miniapp, email, webhook |
| `alert_type` | trend_detected, claim_detected, reward_program, token_launch, grant, scam_warning, truth_check_ready, weekly_digest, admin_message |
| `severity` | low, medium, high, critical |
| `subscription_provider` | manual, stripe, paddle, lemon_squeezy |
| `subscription_status` | active, past_due, canceled, expired |
| `subscription_tier` | free, pro, creator, community, admin |

---

## Key Indexes

```sql
-- Users
CREATE UNIQUE INDEX users_fid_idx ON users (fid);

-- Casts
CREATE INDEX casts_cast_hash_idx ON casts (cast_hash);
CREATE INDEX casts_author_fid_idx ON casts (author_fid);

-- Agent events — dedupeKey partial unique
CREATE UNIQUE INDEX agent_events_dedupe_key_idx ON agent_events (dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Truth checks
CREATE INDEX truth_checks_target_cast_hash_idx ON truth_checks (target_cast_hash);

-- Trends
CREATE INDEX trends_status_idx ON trends (status);

-- Alert deliveries — composite
CREATE INDEX alert_deliveries_user_trend_idx ON alert_deliveries (user_id, trend_id);

-- Rate limit — composite (key, window)
CREATE INDEX rate_limit_events_key_window_idx ON rate_limit_events (key, window_start);
```

---

## updated_at Triggers

Five tables have auto-updating `updated_at` via trigger:
- `users`, `user_preferences`, `subscriptions`, `cast_threads`, `reply_drafts`

---

## Known Issues

1. **`window` column name** in `rate_limit_events` — schema uses `window` but DB column is `window_start` (window is a PostgreSQL reserved keyword). Needs schema alignment.