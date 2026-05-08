# SERVICE_BOUNDARIES.md

## API Service (pulo-api)

**Responsibility:** HTTP endpoints, webhook receiver, rate limiting, job enqueuing

**Ports:** 4311 (primary), 43110–43199 (fallback range)

**Sublicenses:**
- Validates incoming Far payloads
- Enqueues jobs to Redis
- Serves user/DM preferences
- Health and readiness probes

**Does NOT do:**
- LLM inference
- Cast posting
- Trend scanning (delegated to worker)

## Web Service (pulo-web)

**Responsibility:** Next.js dashboard, admin UI, user-facing pages

**Ports:** 4310 (primary), 43100–43199 (fallback range)

**Sublicenses:**
- Authentication via session / NextAuth
- User preference management
- Alert configuration
- Usage stats display

**Does NOT do:**
- Webhook processing
- Job queue management
- Direct Redis access (uses API)

## Worker Service (pulo-worker)

**Responsibility:** Background job processing, LLM calls, trend scanning

**Ports:** 4312 (health only), 43120–43199 (fallback range)

**Sublicenses:**
- Consumes BullMQ jobs
- Calls LLM APIs
- Posts casts/replies via Neynar
- Scans for trends

**Does NOT do:**
- HTTP serving (health probe only)
- Direct DB writes except via job result

## Shared Infrastructure

- **Postgres:** User data, logs, audit trail (port 5544, fallback 55440–55499)
- **Redis:** Job queue, rate limits, cache (port 6388, fallback 63880–63899)

## Communication

- API → Redis (enqueue)
- Worker → Redis (dequeue)
- Worker → Postgres (write results)
- Web → API (REST)
- Web → Postgres (read-only for dashboard, via API proxy)