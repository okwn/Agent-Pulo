# ARCHITECTURE_OVERVIEW.md

## System Architecture

PULO follows a service-oriented monorepo architecture using pnpm workspaces.

## Services

```
apps/web (Next.js 15 App Router)  ── port PULO_WEB_PORT (default 4310)
apps/api (Fastify)                ── port PULO_API_PORT (default 4311)
apps/worker (BullMQ)             ── port PULO_WORKER_PORT (default 4312)
```

## Data / Infrastructure

```
infra/docker/docker-compose.yml
  PostgreSQL 17  ── port PULO_POSTGRES_PORT (default 5544)
  Redis 7        ── port PULO_REDIS_PORT (default 6388)
```

## Packages

```
packages/shared         — Zod env schema, shared types
packages/observability — Pino logger, structured logging
packages/db            — Drizzle ORM, schema definitions
packages/agent-core    — Job orchestration, routing
packages/farcaster    — Neynar SDK wrapper, cast posting
packages/llm           — OpenAI + Anthropic, fallback chain
packages/safety        — Spam/abuse detection, content moderation
packages/radar         — Trend detection, keyword matching
packages/truth         — Fact checking, claim analysis
packages/notifications — DM and alert delivery
```

## Technology Stack

| Layer | Technology |
|---|---|
| Web | Next.js 15, React 19, Tailwind CSS v4 |
| API | Fastify 5 (TypeScript) |
| Worker | BullMQ + ioredis |
| Database | PostgreSQL 17 via Drizzle ORM |
| Cache | Redis 7 via BullMQ |
| LLM | OpenAI GPT-4o mini + Anthropic Claude Haiku |
| Testing | Vitest |
| Monorepo | pnpm workspaces |

## Package Dependencies

```
pulo-web    ← shared, observability
pulo-api    ← shared, observability, farcaster, safety, db
pulo-worker ← all packages

@pulo/llm  ← shared, observability
@pulo/truth ← shared, observability, llm
@pulo/radar ← shared, observability, llm
@pulo/notifications ← shared, observability, farcaster
```

## Error Handling

All errors are typed with Exxx codes (see docs/errors/ERROR_TAXONOMY.md). No silent failures — every LLM error falls back gracefully or returns an error response.

## Environment Variables

All configuration via env vars (see .env.example). Ports default to:
- `PULO_WEB_PORT=4310`
- `PULO_API_PORT=4311`
- `PULO_WORKER_PORT=4312`
- `PULO_POSTGRES_PORT=5544`
- `PULO_REDIS_PORT=6388`