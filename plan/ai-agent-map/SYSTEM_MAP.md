# SYSTEM_MAP.md

## AI Agent System Overview

```
┌─────────────────────────────────────────────────────┐
│                     FARCASTER                        │
│  (mentions, casts, replies, DMs, channel posts)     │
└──────────┬───────────────────────┬─────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────┐    ┌─────────────────────────┐
│  Mention Bot     │    │  Trend Radar            │
│  (webhook recv)  │    │  (scheduler scan)       │
└────────┬─────────┘    └──────────┬──────────────┘
         │                         │
         ▼                         ▼
┌──────────────────────────────────────────────────────┐
│              apps/api — Fastify REST API              │
│  POST /webhook/farcaster  │  GET /health  │  auth   │
└────────────────────────────┬───────────────────────────┘
                             │
         ┌───────────────────┼────────────────────┐
         ▼                   ▼                    ▼
┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐
│  Redis Queue    │  │  Postgres DB     │  │  BullMQ Worker │
│  (BullMQ jobs)  │  │  (Drizzle ORM)   │  │  (apps/worker) │
└─────────────────┘  └──────────────────┘  └───────┬────────┘
         │                                        │
         │         ┌──────────────────────────────┘
         │         ▼
         │  ┌──────────────────────────────────────────┐
         │  │         packages/ — Capability Engines   │
         │  │  @pulo/llm  │ @pulo/truth  │ @pulo/radar │
         │  │  @pulo/safety │ @pulo/farcaster │ @pulo/notifications │
         │  └──────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  apps/web — Next.js 15 Dashboard / Mini App            │
│  Admin Panel · User Preferences · Trend Feed · Alerts  │
└────────────────────────────────────────────────────────┘
```

## Packages and Capabilities

| Package | Responsibility | Public API |
|---|---|---|
| `@pulo/shared` | Zod env schema, shared types | `validateEnv()`, `createAgentJobSchema()` |
| `@pulo/observability` | Pino logger, structured logging | `log`, `createChildLogger()` |
| `@pulo/db` | Drizzle ORM, 15-table schema, repositories | `getDB()`, all `*Repository` exports |
| `@pulo/farcaster` | Neynar SDK wrapper, cast posting | `postCast()`, `lookupUser()` |
| `@pulo/llm` | OpenAI + Anthropic fallback chain | `callLLM(model, prompt)` |
| `@pulo/safety` | Spam/abuse detection, content moderation | `checkContent()`, `checkUser()` |
| `@pulo/radar` | Trend detection (airdrop, grant, reward, token, program) | `detectTrends(text, castHash)` |
| `@pulo/truth` | Fact-check, claim analysis | `analyzeClaim(claim)` |
| `@pulo/notifications` | DM and alert delivery | `sendNotification(payload, apiKey, signerUuid)` |
| `@pulo/agent-core` | Job orchestration, routing | `processJob(job)` |

## Database Schema (15 tables)

```
users ─────────────────────────────┐
  └── user_preferences (1:1)      │
  └── subscriptions (1:N)         │
  └── reply_drafts (1:N)          │
  └── alert_deliveries (1:N)       │
  └── agent_events (N)            │── agent_runs (1:N, via event_id)
  └── agent_runs (N)              │
                                   │
casts ─────────────────────────────┤
  └── agent_events (N, FK)         │
  └── reply_drafts (1:N, FK)       │
  └── truth_checks (1:N, FK)       │
  └── trend_sources (N, FK)        │
  └── safety_flags (N, FK)         │

trends ────────────────────────────┤
  └── trend_sources (1:N)          │
  └── alert_deliveries (N)         │

admin_audit_logs (standalone)
rate_limit_events (standalone)
```

### Key Tables

| Table | Purpose | Key Indexes |
|---|---|---|
| `users` | Far identity, plan, status | `fid` (unique), `username` |
| `user_preferences` | Tone, reply style, alert thresholds, auto-reply mode | `user_id` (unique) |
| `agent_events` | Event sourcing — all inbound interactions | `dedupe_key`, `status`, `type` |
| `agent_runs` | LLM invocation log — tokens, cost, output | `event_id`, `user_id`, `status` |
| `reply_drafts` | LLM-generated replies before approval | `user_id`, `cast_hash`, `status` |
| `truth_checks` | Fact-check records with verdict + evidence | `target_cast_hash`, `user_id` |
| `trends` | Aggregated trend tracking with velocity + score | `category`, `velocity`, `status` |
| `alert_deliveries` | Delivery log with idempotency key | `idempotency_key` (unique), `user_id` |
| `admin_audit_logs` | Immutable admin action audit trail | `entity_type`, `actor_user_id` |
| `rate_limit_events` | Every allow/deny/throttle decision logged | `key`, `user_id` |
| `safety_flags` | Content moderation flags | `cast_hash`, `entity_type`, `severity` |

## Agent Capabilities Map

| Capability | Package | Input | Output | LLM Model |
|---|---|---|---|---|
| Reply Assistant | `@pulo/llm` | Cast text + context | Suggested reply | GPT-4o mini |
| Truth Analysis | `@pulo/truth` | Claim text | Score 0–1 + evidence | Claude Haiku |
| Trend Detection | `@pulo/radar` | Recent casts | Alert + classification | GPT-4o mini |
| Spam Detection | `@pulo/safety` | Cast text | `safe: boolean` + reason | Rule engine |
| Thread Summarize | `@pulo/llm` | Thread casts | Bullet summary | GPT-4o mini |
| User Alert Match | `@pulo/radar` | Cast + user prefs | Alert if matched | Rule engine |
| DM/Alert Delivery | `@pulo/notifications` | User FID + message | Delivery status | — |

## LLM Orchestration

```
Primary: OpenAI GPT-4o mini (reply, trends, summarize)
    ↓ [timeout / error]
Fallback: Anthropic Claude Haiku 4 (truth analysis)
    ↓ [failure]
Error response returned — no silent failures
```

- Max tokens: 512 (reply), 1024 (truth)
- Temperature: 0.7 (reply), 0.5 (truth)
- Token budgets enforced per subscription tier

## Event Flow

```
1. Far webhook → POST /webhook/farcaster (apps/api)
2. API validates signature, checks rate limit (Redis)
3. agent_event created in Postgres (status: pending)
4. Job enqueued to BullMQ (Redis)
5. Worker picks up job → routes by type:
   - mention → @pulo/llm reply engine
   - truth_check_request → @pulo/truth
   - trend_detected → @pulo/radar
6. LLM response → reply_drafts or truth_checks table
7. Result posted to Far via @pulo/farcaster (Neynar)
8. agent_event.status → completed
9. audit_log entry created
```

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PULO_WEB_PORT` | 4310 | Next.js dashboard port |
| `PULO_API_PORT` | 4311 | Fastify API port |
| `PULO_WORKER_PORT` | 4312 | Worker health probe port |
| `PULO_POSTGRES_PORT` | 5544 | PostgreSQL host port |
| `PULO_REDIS_PORT` | 6388 | Redis/BullMQ port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | — | Redis connection string |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `NEYNAR_API_KEY` | — | Neynar API key |
| `NEYNAR_SIGNER_SECRET` | — | Bot signer UUID |

## Ports (All Configurable)

| Service | Env Var | Default |
|---|---|---|
| Web (Next.js) | PULO_WEB_PORT | 4310 |
| API (Fastify) | PULO_API_PORT | 4311 |
| Worker Health | PULO_WORKER_PORT | 4312 |
| Postgres | PULO_POSTGRES_PORT | 5544 |
| Redis | PULO_REDIS_PORT | 6388 |