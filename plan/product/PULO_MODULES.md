# PULO_MODULES.md

## Module Inventory

### Core Modules

| Module | Responsibility | Public API |
|---|---|---|
| `pulo-bot` | Mention handling, reply dispatch | `POST /webhook/farcaster` |
| `pulo-api` | REST API for dashboard, health | `GET /health`, `GET /users/:fid` |
| `pulo-worker` | Background job processor | Redis queue consumer |
| `pulo-web` | Next.js dashboard, admin UI | Port 4310 (or free alternative) |
| `pulo-db` | Postgres schema + migrations | Prisma ORM |
| `pulo-cache` | Redis layer for rate limits, queues | ioredis client |
| `pulo-llm` | LLM orchestration (OpenAI + Anthropic) | `callLLM(model, prompt)` |
| `pulo-farcaster` | Neynar SDK wrapper, cast posting | `postCast()`, `postDM()` |
| `pulo-analytics` | Usage tracking, trend aggregation | Event pipeline |

### Shared Packages

| Package | Contents |
|---|---|
| `@pulo/types` | TypeScript interfaces, Zod schemas |
| `@pulo/config` | Environment validation, defaults |
| `@pulo/logger` | Pino logger, structured logging |
| `@pulo/metrics` | Prometheus-compatible metrics |

## Data Models

### User
```
fid: integer (primary key)
username: string
alertPreferences: jsonb
subscriptionTier: enum (free|pro|team)
rateLimitRemaining: integer
createdAt: timestamp
```

### CastLog
```
id: uuid
fid: integer (foreign key)
castHash: string
parentHash: string (nullable)
content: text
analysisResult: jsonb
processingTimeMs: integer
createdAt: timestamp
```

### AlertConfig
```
id: uuid
fid: integer (foreign key)
keyword: string
alertType: enum (airdrop|grant|reward|token|program)
threshold: float
enabled: boolean
```

## Port Assignments (Default)

| Service | Preferred Port | Alternative Range |
|---|---|---|
| Web (Next.js) | 4310 | 43100–43199 |
| API (Express/Fastify) | 4311 | 43110–43199 |
| Worker Health | 4312 | 43120–43199 |
| Postgres | 5544 | 55440–55499 |
| Redis | 6388 | 63880–63899 |