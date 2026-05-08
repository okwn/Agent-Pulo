# PULO MVP Scope

What is included in the current PULO release vs. planned future work.

## IN SCOPE (MVP Complete)

### Core Infrastructure ✅

- [x] Monorepo with pnpm workspaces
- [x] TypeScript with strict mode
- [x] Database schema (Postgres)
- [x] Redis integration
- [x] Docker Compose setup
- [x] Port detection (no occupied port conflicts)
- [x] Health check endpoints (`/health`, `/health/deep`)
- [x] Metrics endpoint (`/metrics`)

### Far caster Integration ✅

- [x] Neynar API client (`@pulo/farcaster`)
- [x] Webhook endpoint (`/api/webhook/farcaster`)
- [x] Webhook signature verification (HMAC-SHA256)
- [x] Mock mode (works without real keys)
- [x] Cast creation (live mode)
- [x] User FID resolution
- [x] Channel tracking

### Agent Core ✅

- [x] Agent orchestration
- [x] Job queue with retry logic
- [x] Dead letter queue
- [x] Error handling and categorization
- [x] Job cancellation
- [x] Job retry with backoff

### Truth Analysis ✅

- [x] Claim extraction from text
- [x] LLM-based analysis
- [x] Web search for evidence (mock in dev mode)
- [x] Verdict system (TRUE/FALSE/MIXED/etc.)
- [x] Source citation
- [x] Confidence scoring
- [x] Safety blocking

### Radar (Trend Detection) ✅

- [x] Cast clustering
- [x] Trend velocity calculation
- [x] Category assignment
- [x] Trend metadata
- [x] Mock trend data for demo
- [x] Trend history

### Notifications/Alerts ✅

- [x] Keyword alerts
- [x] FID alerts (per-user)
- [x] Cast hash alerts (replies)
- [x] In-memory alert store
- [x] Alert delivery tracking
- [x] Mini App notification stub
- [x] Far caster cast delivery (stub)

### Safety ✅

- [x] URL risk analysis
- [x] Impersonation detection
- [x] Wallet drainer detection
- [x] Seed phrase request blocking
- [x] Urgency tactic detection
- [x] Claim safety analysis
- [x] Safety recommendations

### Observability ✅

- [x] Structured Pino logging
- [x] Correlation IDs
- [x] Prometheus metrics
- [x] Audit logging
- [x] `/metrics` endpoint
- [x] `/health/deep` endpoint
- [x] Admin audit trail

### Security ✅

- [x] Production mode enforcement
- [x] Rate limiting (120 req/min)
- [x] CORS policy
- [x] Body size limits
- [x] Secure headers (CSP, HSTS)
- [x] Admin route protection
- [x] Webhook signature verification
- [x] Secret scanner
- [x] No secrets in frontend bundle

### Admin Dashboard ✅

- [x] System health page
- [x] Error browser + retry
- [x] Job queue management
- [x] Audit events viewer
- [x] Demo controls (seed/run/reset)

### Developer Experience ✅

- [x] `pnpm dev:local` (one-command start)
- [x] `pnpm docker:up/down/logs`
- [x] `pnpm doctor` (health check)
- [x] `pnpm demo:seed` / `pnpm demo:run` / `pnpm demo:reset`
- [x] `pnpm secret:scan`
- [x] Type checking
- [x] Test suite

## OUT OF SCOPE (Not Started)

### Data & Persistence
- [ ] PostgreSQL schema is placeholder (no real migrations)
- [ ] No user persistence in Postgres
- [ ] No alert persistence (in-memory only)
- [ ] No metrics persistence (in-memory only)
- [ ] No audit log persistence (in-memory only)
- [ ] No read replica support
- [ ] No backup/restore automation

### Real API Integration
- [ ] Neynar actual API calls (mocked/stubbed)
- [ ] Real OpenAI/Anthropic calls (mocked/stubbed)
- [ ] Real web search (mocked responses)
- [ ] Real Far caster cast creation (stubbed)
- [ ] Real Mini App notifications (stubbed)

### Production Infrastructure
- [ ] No Kubernetes manifests
- [ ] No Helm charts
- [ ] No Terraform/IaC
- [ ] No managed database setup
- [ ] No CDN configuration
- [ ] No email notifications
- [ ] No SMS notifications

### Advanced Features
- [ ] Multi-tenant isolation
- [ ] OAuth for real users
- [ ] Stripe/payment integration
- [ ] Usage billing tracking
- [ ] API rate limit per user (only global)
- [ ] WebSocket/SSE for real-time
- [ ] Trend prediction ML
- [ ] Sentiment analysis
- [ ] Image/video analysis
- [ ] Multi-language support

### Operations
- [ ] No Kubernetes/Helm
- [ ] No log aggregation (Datadog/LogDNA)
- [ ] No error tracking integration (Sentry configured but not wired)
- [ ] No distributed tracing (OpenTelemetry)
- [ ] No canary deployments
- [ ] No feature flags
- [ ] No A/B testing framework

## PARTIALLY IMPLEMENTED

### Auth
- Demo cookie auth exists (works)
- No real OAuth/Farcaster auth
- No JWT for API auth
- Admin auth only for demo (FID 1)

### Database
- Schema defined but not applied to real DB
- Migrations not automated
- Seeds work via demo scripts

### Worker
- Job queue works in-memory
- No Redis-based distributed queue
- No job prioritization
- No scheduled jobs (cron)

## WHAT IS MOCKED

The following are mocked/simulated and require real API keys for production:

| Feature | Mock Behavior |
|---------|---------------|
| Neynar API | Returns fake cast/user data |
| Webhook verification | Skipped in mock mode |
| LLM calls | Returns canned responses |
| Web search | Returns fake search results |
| Cast creation | Logs to console, doesn't post |
| Mini App notifications | Logs to console, doesn't send |
| Database | Uses in-memory stores |

## WHAT REQUIRES REAL KEYS

To switch from mock to live mode:

1. **Neynar API Key** — For real webhook events and Far caster API
2. **Neynar Webhook Secret** — For webhook signature verification
3. **OpenAI API Key** — For real LLM-powered truth analysis
4. **Anthropic API Key** — Optional, for Claude models
5. **Far caster Bot Signer** — Required for PULO to post as the bot

## KNOWN LIMITATIONS

See [FINAL_KNOWN_LIMITATIONS.md](./FINAL_KNOWN_LIMITATIONS.md) for complete list.
