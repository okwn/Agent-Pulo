# PHASE_01_MONOREPO.md

## Objective

Scaffold a production-grade TypeScript monorepo with pnpm workspaces, laying the foundation for all PULO services and packages.

## What was built

| Item | Status |
|---|---|
| Monorepo root (package.json, pnpm-workspace.yaml, tsconfig) | ✅ |
| 10 packages (@pulo/shared, observability, db, agent-core, farcaster, llm, safety, radar, truth, notifications) | ✅ |
| 3 apps (pulo-api Fastify, pulo-web Next.js, pulo-worker BullMQ) | ✅ |
| Docker Compose infra (Postgres + Redis) | ✅ |
| Base tsconfigs per workspace | ✅ |
| Root lint (ESLint flat config) + Prettier | ✅ |
| Package scripts: dev, build, typecheck, test, doctor | ✅ |
| Port env vars: PULO_WEB_PORT, PULO_API_PORT, PULO_WORKER_PORT, PULO_POSTGRES_PORT, PULO_REDIS_PORT | ✅ |

## Tech Choices

### Drizzle vs Prisma
**Chose: Drizzle ORM**

Why: Lightweight, SQL-like, no schema drift, tree-shakeable, migrations are plain SQL you own. Prisma is heavier and its schema inferrer can drift from reality on complex schemas. For a small team that needs to move fast and own the SQL, Drizzle wins.

### BullMQ
**Chose: BullMQ**

Why: Battle-tested Redis-backed queue, great observability, delayed/retry/priority jobs, delayed jobs, rate limiting built in. No Kafka complexity for a product of this scale.

## Still Needed

- Real job handlers in packages/agent-core
- Far webhook endpoint in api
- Next.js dashboard pages (dashboard, alerts, settings)
- DB migrations with Drizzle Kit
- Health/ready checks with actual DB + Redis probes
- Test coverage > 60%

## Next Steps

1. Run `pnpm install`
2. Run `pnpm typecheck` to verify TS
3. Run `pnpm test` to verify vitest
4. Start infra: `docker compose -f infra/docker/docker-compose.yml up -d`
5. Implement Phase 2: webhook receiver + job handlers