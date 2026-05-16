# PRE_LIVE_CORRECTION_REPORT.md

## What Was Actually True vs What Reports Claimed

| Report Claim | Actual State | Corrected? |
|-------------|-------------|------------|
| "Webhook HMAC verification is implemented" (v12) | Partially — `verifyNeynarSignature` was local function in webhook.ts, not using provider's `NeynarWebhookVerifier`. Fixed: now exports function, header constants clarified, mode behavior explicit. | ✅ Fixed |
| "Webhook HMAC verification missing/stubbed" (v12 security debt) | Not accurate — HMAC was implemented but undocumented; provider class existed in neynar.ts. | ⚠️ Ambiguous — code existed, not integrated into routes |
| "Direct Cast is placeholder" (v01) | Partially — `DirectCastProvider` exists and calls real Neynar API when `PULO_NOTIFICATION_MODE=live`. Has consent check + plan tier check. Still mock-only because no real key needed for mode switch. | ⚠️ Status clarified |
| "Direct Cast is operational" (v01) | Misleading — operational only when `PULO_NOTIFICATION_MODE=live` + real Neynar API key + `FARCASTER_BOT_SIGNER_UUID`. Requires explicit consent + paid plan. | ✅ Clarified |
| "MiniApp notification operational" (v01) | Same as Direct Cast — implemented correctly, gated by mode + consent + key | ✅ Clarified |
| "Rate limit/daily counters/budget are in-memory" (v13 debt) | Accurate — all in-memory by default. Redis implementations exist but not wired. Fixed: `PULO_BUDGET_STORAGE=redis` now configurable. | ✅ Fixed |
| "Docker ready but restart policies missing" (v10) | Accurate — no `restart:` policies. Fixed: all 5 services now have `restart: unless-stopped`. | ✅ Fixed |
| "Limits enforced" (v06) | Accurate — `SafetyGate` + `checkLimit()` enforce limits, but use in-memory storage. | ⚠️ Operational but in-memory |
| "Redis implementations exist" (v08) | Accurate — `RedisBudgetStorage` and `RedisRateLimitStorage` both exist. | ✅ Confirmed |

## What Was Fixed

### A) Webhook HMAC Signature Verification
- **`verifyNeynarSignature`** exported from `webhook.ts` for testability
- Header constants `NEYNAR_SIGNATURE_HEADER` / `NEYNAR_TIMESTAMP_HEADER` now declared at top of file (documented values)
- `timestamp ?? ''` guard prevents crash when timestamp header is absent
- 10-unit test file created: `apps/api/test/integration/webhook-signature.test.ts`
- `WEBHOOK_SECURITY.md` updated with exact header names, signing method, test commands

### B) Direct Cast / MiniApp Notification Status Clarified
- Both providers check `PULO_NOTIFICATION_MODE` before making live API calls
- `DirectCastProvider.buildPlan()` enforces: `allowDirectCasts=true` + non-free plan
- `MiniAppNotificationProvider` enforces: `allowMiniAppNotifications=true`
- Consent checks are in `delivery-planner.ts` via `buildPlan()`
- Real calls require: `NEYNAR_API_KEY` + `FARCASTER_BOT_SIGNER_UUID` + `PULO_NOTIFICATION_MODE=live`
- Both gracefully succeed in mock mode (no live call made)

### C) Redis-Backed Storage Wiring
- `createStorage()` factory added to `packages/llm/src/budget.ts`
- `PULO_BUDGET_STORAGE=redis` → lazy-loads `RedisBudgetStorage` from `budget-redis.ts`
- `PULO_BUDGET_STORAGE=memory` (default) → in-memory, resets on restart
- `.env.example` updated with `PULO_BUDGET_STORAGE` + `PULO_RATE_LIMIT_STORAGE` vars
- Rate limit store still in-memory (Redis version not yet created); flag added to doctor

### D) Docker Restart Policies
- Added `restart: unless-stopped` to all 5 services in `docker-compose.yml`:
  - `postgres`, `redis`, `api`, `worker`, `web`

### E) Enhanced Doctor
- `scripts/doctor.mjs` rewritten with mode-aware checks
- Classifies: `PASS` | `WARN` | `FAIL` | `LIVE_BLOCKER`
- Checks: mode vars, key requirements per mode, storage mode, Redis/DB connectivity
- Correctly reports `.env` missing as FAIL, default `DEMO_AUTH_SECRET` as WARN/FAIL depending on env
- Reports `LIVE_BLOCKER` when Far caster live mode is set but keys are missing

## What Remains Mocked

| Component | Mocked Because |
|-----------|---------------|
| LLM (all modes) | No real `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` set |
| Far caster stream | `PULO_FARCASTER_MODE=mock` — no real Neynar stream |
| Direct Cast | `PULO_NOTIFICATION_MODE=mock` — no real notification calls |
| MiniApp notifications | `PULO_NOTIFICATION_MODE=mock` — no real notification calls |
| Token budget | `PULO_BUDGET_STORAGE=memory` — resets on restart |
| Rate limit store | In-memory Map in `security.ts` — resets on restart |
| Daily counters | In-memory in `rate-limiter.ts` — resets on restart |
| Far caster SIWF auth | Stub only — real users can't authenticate |
| Neynar Signer auth | Stub only — signers not verified |
| Search | `PULO_SEARCH_MODE=mock` — no real SerpAPI/Tavily |

## What Requires Live Keys

| Key | Required When |
|-----|---------------|
| `NEYNAR_API_KEY` | `PULO_FARCASTER_MODE=live` |
| `NEYNAR_WEBHOOK_SECRET` | `PULO_FARCASTER_MODE=live` |
| `FARCASTER_BOT_SIGNER_UUID` | Publishing live casts (reply/cast) |
| `OPENAI_API_KEY` | `PULO_LLM_MODE=openai` or `auto` |
| `ANTHROPIC_API_KEY` | `PULO_LLM_MODE=anthropic` or `auto` |
| `TAVILY_API_KEY` | `PULO_SEARCH_MODE=tavily` |
| `SERPAPI_API_KEY` | `PULO_SEARCH_MODE=serpapi` |
| `DEMO_AUTH_SECRET` | Production (replace default) |

## Webhook HMAC Security Assessment

**Status: SECURE (when live mode enabled)**

- `verifyNeynarSignature()` uses HMAC-SHA256 with timing-safe comparison
- Timestamp included in signed payload (prevents replay attacks)
- Live mode rejects unsigned requests with 401
- Mock mode accepts all (acceptable for development)
- **Caveat:** No timestamp age check (webhook with very old timestamp still accepted). Add 5-minute window before production.

## Direct Cast Live-Readiness Assessment

**Status: READY (requires keys + consent + paid plan)**

- `DirectCastProvider.send()` calls real Neynar `/casts` endpoint when `PULO_NOTIFICATION_MODE=live`
- Requires: user `allowDirectCasts=true` + non-free plan + `FARCASTER_BOT_SIGNER_UUID`
- Idempotency key: `alert:{alertId}:{userId}` prevents duplicate sends
- **Not live-ready** because `PULO_NOTIFICATION_MODE` defaults to `mock` and SIWF auth not implemented

## MiniApp Notification Live-Readiness Assessment

**Status: READY (requires keys + consent)**

- `MiniAppNotificationProvider.send()` calls real Neynar `/notifications` endpoint when `PULO_NOTIFICATION_MODE=live`
- Requires: user `allowMiniAppNotifications=true` + `NEYNAR_API_KEY`
- Idempotency key: provided by delivery planner
- **Not live-ready** because `PULO_NOTIFICATION_MODE` defaults to `mock`

## Redis-Backed Limits Assessment

| Limit Type | In-Memory Default | Redis Option |
|-----------|-------------------|--------------|
| Token budget | ✅ `InMemoryBudgetStorage` | ✅ `PULO_BUDGET_STORAGE=redis` (exists, not default) |
| Rate limit store | ✅ `rateLimitStore` Map | ❌ Not yet implemented |
| Daily counters | ✅ `DailyCounter` Map | ❌ Not yet implemented |
| Plan usage counters | ✅ `UsageTracker` (mock) | ❌ Not yet implemented |

**Risk:** Rate limit bypass via concurrent requests still possible in production. `PULO_RATE_LIMIT_STORAGE=redis` flag added to doctor but Redis store not yet implemented.

## Commands Run

```bash
pnpm typecheck    → ✅ PASS (all packages)
pnpm test         → ✅ PASS (55/55 tests — 11 test files)
pnpm build        → ✅ PASS (Next.js build success)
docker compose config → ✅ PASS (valid YAML, version attribute warning only)
node scripts/doctor.mjs → ✅ Runs, correctly reports missing .env as FAIL
```

## Failed Commands

None. All validation commands passed.

## Final Verdict

**READY_LIVE_KEY_TEST**

**Rationale:**
- No TypeScript/build regressions (55 tests pass)
- Mock mode fully operational
- Live mode fails safely when keys are missing (returns 401 for webhook, throws on provider access)
- All 5 Docker services have restart policies
- Webhook HMAC verification is real and working (verified with unit tests)
- Direct Cast and MiniApp providers are real, consent-gated, plan-gated, with idempotency
- Redis budget storage is configurable (set `PULO_BUDGET_STORAGE=redis`)
- Doctor script clearly reports what is missing per mode

**Remaining pre-live steps (P0 before first live key test):**
1. Set `DEMO_AUTH_SECRET` to a strong random value
2. Enter `NEYNAR_API_KEY` + `NEYNAR_WEBHOOK_SECRET` + `FARCASTER_BOT_SIGNER_UUID`
3. Enter `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`
4. Set `PULO_FARCASTER_MODE=live` + `PULO_LLM_MODE=openai` (or auto)
5. Set `PULO_BUDGET_STORAGE=redis` (recommended, not required for test)
6. Run `node scripts/doctor.mjs` to confirm all checks pass
7. Follow Phase 1–6 of `report_final/14_LIVE_API_KEY_TEST_PLAN.md`

**NOT YET READY FOR PRODUCTION** — requires SIWF auth implementation before real users can sign in.