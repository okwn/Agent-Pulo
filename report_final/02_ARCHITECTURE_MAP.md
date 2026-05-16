# 02_ARCHITECTURE_MAP.md

## System Architecture

```
Far caster Network ←→ [Neynar webhook] → pulo-api (:4311)
                                           │
                              ┌────────────┼────────────┐
                              ↓            ↓            ↓
                         postgres      redis        worker
                         (:5432)      (:6379)       (:4321)
                                          │
                                     pulo-web (:3100)
```

## Package Architecture (18 packages)

```
packages/
├── llm/           — LLM provider abstraction + prompt versioning
├── farcaster/     — Far caster API + mock/live modes  
├── truth/         — Claim extraction + verdict generation
├── radar/         — Trend detection + velocity scoring
├── safety/        — Safety gate + block/review/allow thresholds
├── composer/       — Style transfer + thread builder
├── billing/       — Plan tiers + usage tracking
├── notifications/  — Alert delivery + channels
├── observability/ — Pino logging + audit events + Prometheus metrics
├── errors/         — Error store + retry queue + dead letter queue
├── db/            — Prisma schema + migrations
├── shared/        — Env validation + shared types
├── auth/          — Demo session tokens + admin guard
├── agent-core/    — Agent orchestration
```

## App Architecture (4 apps)

```
apps/
├── api/     — Fastify REST API (:4311)
├── web/     — Next.js admin + user UI (:3100)  
├── worker/  — BullMQ background job processor (:4321)
└── local/   — Docker Compose dev environment
```

## Key Files Evidence

| File | Purpose |
|------|--------|
| `apps/api/src/server.ts` | Fastify entry — all routes registered |
| `apps/api/src/routes/webhook.ts` | POST /api/webhook/farcaster |
| `apps/api/src/routes/admin.ts` | 20+ admin endpoints |
| `packages/farcaster/src/index.ts` | `setMode()` / `getMode()` |
| `packages/llm/src/providers/auto-fallback.ts` | Cross-provider fallback |
| `packages/safety/src/gate.ts` | SafetyGate class |
| `packages/db/src/schema.ts` | Prisma schema (all tables) |
| `packages/observability/src/index.ts` | Pino logger + audit |

## Ports (All Env-Driven)

| Service | Env Variable | Default |
|---------|-------------|---------|
| API | `PULO_API_PORT` | 4311 |
| Web | `PULO_WEB_PORT` | 3100 |
| Postgres | `PULO_POSTGRES_PORT` | 5432 |
| Redis | `PULO_REDIS_PORT` | 6379 |
| Worker health | internal | 4321 |

## Environment Modes

```
PULO_FARCASTER_MODE=mock|live
PULO_LLM_MODE=mock|openai|anthropic|local|auto
PULO_SEARCH_MODE=mock|tavily|serpapi
PULO_NOTIFICATION_MODE=mock|live
```

No hardcoded ports, no assumed resources — all driven by env vars.