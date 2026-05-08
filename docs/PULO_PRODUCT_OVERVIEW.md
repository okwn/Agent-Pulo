# PULO Product Overview

PULO is a Far caster bot platform that monitors the network for mentions, truth-checks claims, detects trends, and alerts subscribed users.

## What PULO Does

**PULO monitors Far caster and helps users:**
1. **Understand what's real** — Truth analysis on claims made in casts
2. **Catch trends early** — Radar detects emerging topics before they go viral
3. **Stay informed** — Alert system notifies users of relevant content
4. **Reply with context** — Composer helps craft informed responses

## Core Features

### 1. Mention Bot

When a user mentions `@pulo` on Far caster, PULO:
- Receives the cast via webhook from Neynar
- Generates a truth analysis on the claim
- Optionally replies with the analysis (live mode)
- Tracks engagement metrics

**Demo mode**: Works without real Neynar keys. Use test endpoint to simulate mentions.

### 2. Truth Analysis

PULO analyzes claims for accuracy:
- **Claim extraction** — Identifies factual claims in natural text
- **Web search** — Searches for corroborating/disputing sources (requires live mode with LLM + search)
- **Verdict** — TRUE / MOSTLY_TRUE / MIXED / MOSTLY_FALSE / FALSE / UNVERIFIABLE
- **Sources** — Links to evidence

**Mock mode**: Returns simulated verdicts without real web search.

### 3. Radar (Trend Detection)

PULO monitors the network for emerging topics:
- Clusters related casts into trends
- Ranks by velocity (posts per hour)
- Provides trend metadata (categories, key terms)
- Tracks trend lifecycle (rising, peaked, declining)

**Mock mode**: Returns seeded demo trends.

### 4. Alerts

Users subscribe to alerts on:
- Specific keywords (e.g., "Ethereum", "NFT")
- Specific FIDs (e.g., a specific user)
- Specific cast hashes (replies to a specific cast)
- Truth verdict thresholds (e.g., alerts when FALSE claims appear)

Alert delivery channels:
- **Far caster casts** — PULO bot replies to user (live mode)
- **Mini App notifications** — In-app notifications (requires Mini App setup)

**Mock mode**: Alerts are tracked but delivery is simulated.

### 5. Composer

Reply assistance for admins:
- Shows context (original claim, truth analysis)
- Suggests reply text
- Enforces safety rules (no seed phrase requests, no wallet connects)

### 6. Admin Dashboard

Web-based admin panel at `/admin`:
- **System** — Health, metrics, audit logs
- **Errors** — Error browser, retry dead letter jobs
- **Jobs** — Job queue management
- **Events** — Webhook event browser
- **Users** — User management, plan changes
- **Demo** — Demo scenario controls

## Architecture

```
Internet → Neynar Webhook → API (:4311) → Worker
                                      ↓
                                  Postgres + Redis
                                      ↓
                                   LLM API
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| `apps/api` | 4311 | Fastify REST API |
| `apps/web` | 4310 | Next.js admin dashboard |
| `apps/worker` | 4321 | Background job processor |
| `postgres` | 5544 | PostgreSQL database |
| `redis` | 6388 | Redis for queue/caching |

### Packages

| Package | Description |
|---------|-------------|
| `@pulo/farcaster` | Neynar API integration |
| `@pulo/agent-core` | Agent orchestration |
| `@pulo/truth` | Truth analysis engine |
| `@pulo/radar` | Trend detection |
| `@pulo/notifications` | Alert delivery |
| `@pulo/safety` | Safety validation |
| `@pulo/observability` | Metrics, logging, audit |
| `@pulo/shared` | Shared utilities |
| `@pulo/auth` | Demo auth |

## User Plans

### Free Plan
- 10 truth checks/month
- 10 alerts/month
- Radar read-only
- No bot replies

### Pro Plan
- Unlimited truth checks
- Unlimited alerts
- Bot replies enabled
- Priority processing

## Technical Constraints

| Constraint | Limit |
|------------|-------|
| Truth checks (free) | 10/month |
| Alerts (free) | 10/month |
| Cast length | 280 characters |
| Webhook body | 1MB max |
| Rate limit | 120 req/min |

## Modes

### Mock Mode (Development)
- No real API keys needed
- Simulated responses
- Test endpoints available
- Fast iteration

### Live Mode (Production)
- Requires real Neynar API key
- Requires real LLM API keys
- Webhook verification enabled
- Real Far caster interactions

## Security

PULO implements:
- Production mode enforcement (refuses to start without real secrets)
- Rate limiting (120 req/min per IP)
- CORS with strict origin checking
- Body size limits (1MB max)
- Secure headers (CSP, HSTS, X-Frame-Options)
- Webhook signature verification (HMAC-SHA256)
- URL risk analysis (scam detection)
- Admin route protection with audit logging
- Secret scanning (prevents accidental commits)

## Deployment Options

1. **Docker Compose (Recommended for local)**
   - `pnpm dev:local`
   - Self-contained stack

2. **VPS** — Direct Docker on Ubuntu
   - Full control
   - Manual management

3. **Dokploy** — Self-hosted PaaS
   - Git-based deployments
   - Managed databases

4. **Coolify** — Self-hosted alternative to Vercel
   - One-click deployments
   - Automatic HTTPS

## Current Status

**READY_LOCAL_MOCK** — Project runs locally in mock mode without real API keys. All core features are demonstrable. Live mode requires real Neynar/Warpcast/OpenAI/Anthropic keys.

**See [PULO_MVP_SCOPE.md](./PULO_MVP_SCOPE.md) for what's included vs. planned.**
