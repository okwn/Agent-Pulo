# Environment Variables Reference

## Mode Configuration (Independent)

Each provider mode operates independently — mock mode needs zero keys.

| Variable | Default | Mode | Description |
|----------|---------|------|-------------|
| `PULO_APP_ENV` | `local` | all | `local` \| `staging` \| `production` |
| `PULO_FARCASTER_MODE` | `mock` | farcaster | `mock` (no keys) \| `live` (requires NEYNAR_API_KEY) |
| `PULO_LLM_MODE` | `mock` | llm | `mock` \| `openai` \| `anthropic` \| `local` |
| `PULO_SEARCH_MODE` | `mock` | search | `mock` \| `tavily` \| `serpapi` \| `disabled` |
| `PULO_NOTIFICATION_MODE` | `mock` | notification | `mock` \| `live` |
| `PULO_BILLING_MODE` | `mock` | billing | `mock` \| `stripe` \| `hypersub` \| `disabled` |
| `PULO_AUTH_MODE` | `demo` | auth | `demo` \| `farcaster` \| `disabled` |

---

## Required Keys by Mode

### `PULO_FARCASTER_MODE=live`
| Variable | Required | Description |
|----------|----------|-------------|
| `NEYNAR_API_KEY` | **Yes** | Neynar API key for reading/writing casts |
| `NEYNAR_WEBHOOK_SECRET` |Webhook only | For verifying incoming webhooks |
| `FARCASTER_BOT_SIGNER_UUID` | Posting only | Signer UUID for the bot account |

### `PULO_LLM_MODE=openai`
| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | **Yes** | OpenAI API key |

### `PULO_LLM_MODE=anthropic`
| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | Anthropic API key |

### `PULO_LLM_MODE=local`
| Variable | Required | Description |
|----------|----------|-------------|
| `LOCAL_LLM_URL` | **Yes** | Local LLM server URL (e.g. `http://localhost:11434`) |

### `PULO_SEARCH_MODE=tavily`
| Variable | Required | Description |
|----------|----------|-------------|
| `TAVILY_API_KEY` | **Yes** | Tavily API key for truth search |

### `PULO_SEARCH_MODE=serpapi`
| Variable | Required | Description |
|----------|----------|-------------|
| `SERPAPI_API_KEY` | **Yes** | SerpAPI API key |

### `PULO_BILLING_MODE=stripe`
| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | **Yes** | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` |Webhook only | Stripe webhook verification secret |

---

## Always-Required (No Mode Dependency)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | — | **Yes** | PostgreSQL connection string |
| `REDIS_URL` | — | **Yes** | Redis connection string |

---

## Optional Keys (No Mode Dependency)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `PULO_WEB_PORT` | `4310` | Web host port |
| `PULO_API_PORT` | `4311` | API host port |
| `PULO_WORKER_PORT` | `4312` | Worker health port |
| `PULO_POSTGRES_PORT` | `5432` | PostgreSQL host port |
| `PULO_REDIS_PORT` | `6379` | Redis host port |

---

## Optional Provider Keys

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required only if `PULO_LLM_MODE=openai` |
| `ANTHROPIC_API_KEY` | Required only if `PULO_LLM_MODE=anthropic` |
| `TAVILY_API_KEY` | Required only if `PULO_SEARCH_MODE=tavily` |
| `SERPAPI_API_KEY` | Required only if `PULO_SEARCH_MODE=serpapi` |
| `STRIPE_SECRET_KEY` | Required only if `PULO_BILLING_MODE=stripe` |
| `NEYNAR_API_KEY` | Required only if `PULO_FARCASTER_MODE=live` |
| `FARCASTER_BOT_SIGNER_UUID` | Bot signer for posting casts |
| `WARPCAST_API_KEY` | Optional, for direct cast via Warpcast |
| `SENTRY_DSN` | Optional, Sentry error tracking |
| `LOGDNA_KEY` | Optional, LogDNA log aggregation |

---

## .env.example Sections

```bash
# ─── Modes ──────────────────────────────────────────────────────────
PULO_APP_ENV=local                    # local | staging | production
PULO_FARCASTER_MODE=mock             # mock | live
PULO_LLM_MODE=mock                   # mock | openai | anthropic | local
PULO_SEARCH_MODE=mock                # mock | tavily | serpapi | disabled
PULO_NOTIFICATION_MODE=mock         # mock | live
PULO_BILLING_MODE=mock               # mock | stripe | hypersub | disabled
PULO_AUTH_MODE=demo                 # demo | farcaster | disabled

# ─── Database & Redis ──────────────────────────────────────────────
DATABASE_URL=postgresql://pulo:pulo_dev_password@localhost:5432/pulo_dev
REDIS_URL=redis://localhost:6379

# ─── Neynar / Far caster (required for PULO_FARCASTER_MODE=live) ──
NEYNAR_API_KEY=                      # Required for live mode
NEYNAR_WEBHOOK_SECRET=              # For webhook verification
FARCASTER_BOT_SIGNER_UUID=          # Bot signer UUID for posting

# ─── LLM Providers ──────────────────────────────────────────────────
OPENAI_API_KEY=                     # Required for llm=openai
ANTHROPIC_API_KEY=                  # Required for llm=anthropic
LOCAL_LLM_URL=http://localhost:11434 # Required for llm=local

# ─── Search ─────────────────────────────────────────────────────────
TAVILY_API_KEY=                     # Required for search=tavily
SERPAPI_API_KEY=                    # Required for search=serpapi

# ─── Billing ────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=                  # Required for billing=stripe
STRIPE_WEBHOOK_SECRET=             # For Stripe webhook verification

# ─── Optional ──────────────────────────────────────────────────────
LOG_LEVEL=info
SENTRY_DSN=
LOGDNA_KEY=
```

---

## Validation

On startup, PULO diagnoses all modes. Missing required keys produce `AppError` with setup instructions. Run `pnpm doctor` to check mode status and key availability.