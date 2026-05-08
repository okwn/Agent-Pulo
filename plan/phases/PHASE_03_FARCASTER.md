# PHASE_03_FARCASTER.md — Provider Abstraction Layer

**Status:** Completed 2026-05-07
**Deliverables:** 8 source files, 3 API routes, 4 docs

## What Was Built

### Source Files (packages/farcaster/src/)

| File | Purpose |
|---|---|
| `errors.ts` | `FarError` class hierarchy — 12 error types, `isRetryable()`, `getErrorCode()` |
| `idempotency.ts` | `makeIdempotencyKey()`, `withIdempotencyKey()` (in-flight dedup), `isValidIdempotencyKey()`, `parseIdempotencyKey()` |
| `normalize.ts` | `NormalizedEvent` union, `normalizeNeynarWebhook()`, `extractMentionedFids()`, `normalizeCast()` |
| `providers/interfaces.ts` | `IFarcasterReadProvider`, `IFarcasterWriteProvider`, `IFarcasterNotificationProvider`, `IWebhookVerifier`, `IFarcasterProvider`, all domain types |
| `providers/mock.ts` | `MockFarcasterProvider` (mock mode), tracking for notifications/direct casts/published |
| `providers/neynar.ts` | `NeynarFarcasterProvider` (live mode), `requireKey()` guards, `withRetry()`, `mapNeynarCast/User` |
| `providers/index.ts` | Re-exports all providers |
| `factory.ts` | `getProvider()`, `setMode()`, `getMode()`, `clearProvider()`, `requireLiveProvider()`, `requireMockProvider()` |
| `webhook.ts` | `verifyAndNormalizeMention()`, `verifyCastWebhook()` |
| `index.ts` | Public API — exports all modules |

### API Routes (apps/api/src/routes/farcaster.ts)

| Route | Method | Description |
|---|---|---|
| `/api/farcaster/health` | GET | Provider health check — returns mode, provider name, error |
| `/api/webhooks/farcaster/mentions` | POST | Incoming mention webhook — verifies signature, normalizes, stores `agent_event` |
| `/api/admin/mock/farcaster/mention` | POST | Injects mock mention for dev (blocked in production) |

### Documentation

| File | Content |
|---|---|
| `docs/farcaster/FARCASTER_PROVIDER.md` | Provider architecture, interfaces, mode gating, env vars, mock behavior |
| `docs/errors/FARCASTER_ERRORS.md` | Error taxonomy, codes, helpers, Neynar-specific behavior |
| `docs/farcaster/FARCASTER_INTEGRATION_NOTES.md` | Pre-existing — Neynar API integration notes |

## Design Decisions

1. **Mock-first by default** — `PULO_FARCASTER_MODE=mock` (default). Provider auto-initializes without env vars in mock mode.
2. **Write operations are backend-only** — `publishCast`, `publishReply`, `deleteCast` require `signerUuid`. Frontend cannot call write methods.
3. **Credential guards at construction** — Neynar provider throws `MissingCredentialsError` in `constructor()` if `NEYNAR_API_KEY` is missing/placeholder.
4. **Mode mismatch guards** — `requireLiveProvider()` / `requireMockProvider()` throw if mode doesn't match operation.
5. **Retry on retryable errors** — `withRetry()` wrapper uses `isRetryable()` to determine whether to retry with 2 attempts.
6. **Webhook stores to agent_events** — All incoming webhooks are normalized and persisted to `agent_events` table with `deduplicationKey`.

## Environment Variables

```
PULO_FARCASTER_MODE=mock|live  (default: mock)
NEYNAR_API_KEY=                (required in live mode)
NEYNAR_WEBHOOK_SECRET=         (required for webhook verification in live)
FARCASTER_BOT_SIGNER_UUID=     (required for write operations in live)
```

## Acceptance Criteria (Phase 3)

- [x] Provider abstraction with IFarcasterProvider interface
- [x] Neynar provider with credential guards
- [x] Mock provider for local dev and tests
- [x] Error class hierarchy with isRetryable() helper
- [x] Idempotency helpers with in-flight deduplication
- [x] Normalization of incoming webhooks to NormalizedEvent
- [x] GET /api/farcaster/health route
- [x] POST /api/webhooks/farcaster/mentions route (stores agent_event)
- [x] POST /api/admin/mock/farcaster/mention route (dev only, blocked in prod)
- [x] FARCASTER_PROVIDER.md and FARCASTER_ERRORS.md documentation
- [x] All write operations backend-only (no frontend access)
- [x] Mock mode never calls external APIs

## Next Phase

**Phase 4:** LLM integration — `@pulo/llm` package with OpenAI/Anthropic providers, structured output schemas, streaming support.