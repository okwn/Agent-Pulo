# Environment Variables Reference

All environment variables used in PULO, organized by category.

## Service

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PULO_SERVICE_NAME` | `pulo` | Yes | Service identifier in logs |
| `NODE_ENV` | `development` | Yes | `development` or `production` |
| `LOG_LEVEL` | `info` | No | Log verbosity: `debug`, `info`, `warn`, `error` |
| `PULO_FARCASTER_MODE` | `mock` | Yes | `mock` (local dev) or `live` (production) |

## API Server

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `API_PORT` | `4311` | No | API server port |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Yes | Comma-separated CORS origins |
| `RATE_LIMIT_PER_MINUTE` | `120` | No | Rate limit per IP |
| `BODY_SIZE_LIMIT` | `1048576` | No | Max request body size in bytes (1MB default) |
| `DEMO_COOKIE_SECRET` | (generated) | Yes | Secret for demo session cookies |

## Database

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | — | Yes | PostgreSQL connection string |
| `POSTGRES_HOST` | `localhost` | No | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | No | PostgreSQL port |
| `POSTGRES_USER` | `pulo` | No | PostgreSQL username |
| `POSTGRES_PASSWORD` | — | Yes | PostgreSQL password |
| `POSTGRES_DB` | `pulo` | No | PostgreSQL database name |

Example `DATABASE_URL`:
```
postgresql://pulo:my_strong_password@localhost:5432/pulo
```

## Redis

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Yes | Redis connection string |
| `REDIS_HOST` | `localhost` | No | Redis host |
| `REDIS_PORT` | `6379` | No | Redis port |
| `REDIS_PASSWORD` | (none) | No | Redis password (if auth enabled) |

## Neynar (Farcaster Integration)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `NEYNAR_API_KEY` | — | **Yes for live mode** | Neynar API key |
| `NEYNAR_WEBHOOK_SECRET` | — | **Yes for live mode** | Webhook signature secret |
| `NEYNAR_SIGNER_UUID` | — | **Yes for posting** | Bot's Far caster signer UUID |
| `PULO_FARCASTER_BOT_FID` | `1` | No | Bot's FID (default: 1 for demo) |

**Note:** `NEYNAR_API_KEY` must NOT be `PLACEHOLDER` or `undefined` in production. The server will refuse to start.

## LLM Providers

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `OPENAI_API_KEY` | — | **Yes for live mode** | OpenAI API key (for GPT models) |
| `ANTHROPIC_API_KEY` | — | No | Anthropic API key (for Claude models) |
| `LLM_MODEL` | `gpt-4o-mini` | No | Default LLM model |
| `LLM_MAX_TOKENS` | `1000` | No | Max tokens per request |

## Mini App Notifications

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `MINI_APP_NOTIFICATION_ENABLED` | `false` | No | Enable Mini App notifications |
| `MINI_APP_BOT_FID` | — | Conditional | Bot FID for sending notifications |
| `MINI_APP_WEBAPP_URL` | — | Conditional | WebApp URL for deep links |

## Observability

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `METRICS_ENABLED` | `true` | No | Enable metrics collection |
| `SENTRY_DSN` | — | No | Sentry error tracking |
| `LOGDNA_KEY` | — | No | LogDNA log aggregation |

## Demo Mode

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DEMO_USER_FID` | `1` | No | Demo user's FID |
| `DEMO_USER_USERNAME` | `demo` | No | Demo user's username |
| `DEMO_USER_DISPLAY_NAME` | `Demo User` | No | Demo user's display name |

## Ports (Docker/Local Dev)

| Variable | Default | Description |
|----------|---------|-------------|
| `PULO_API_PORT` | `4311` | API host port |
| `PULO_WEB_PORT` | `4310` | Web host port |
| `PULO_WORKER_PORT` | `4312` | Worker health port |
| `PULO_POSTGRES_PORT` | `5544` | PostgreSQL host port |
| `PULO_REDIS_PORT` | `6388` | Redis host port |

## Docker Compose

```yaml
# Minimum required for live mode
services:
  api:
    environment:
      - NODE_ENV=production
      - PULO_FARCASTER_MODE=live
      - DATABASE_URL=postgresql://pulo:${POSTGRES_PASSWORD}@postgres:5432/pulo
      - REDIS_URL=redis://redis:6379
      - NEYNAR_API_KEY=${NEYNAR_API_KEY}
      - NEYNAR_WEBHOOK_SECRET=${NEYNAR_WEBHOOK_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ALLOWED_ORIGINS=https://your-domain.com
```

## Validation

On startup, PULO validates environment:

```typescript
// Production mode requires these to be REAL values (not PLACEHOLDER)
const required = ['NEYNAR_API_KEY', 'DATABASE_URL', 'REDIS_URL'];
```

If any contain `PLACEHOLDER`, `undefined`, or empty string, production mode refuses to start.
