# 13_TECHNICAL_DEBT.md

## Status: ⚠️ ACKNOWLEDGED — Several Known Items Tracked

## Evidence

| File | Status |
|------|--------|
| `packages/llm/src/budget-redis.ts` | ⚠️ `RedisBudgetStorage` implemented but not default |
| `packages/auth/src/index.ts` | ⚠️ SIWF + Neynar auth stubs |
| `packages/llm/src/index.test.ts` | ⚠️ Some tests use `parseFloat(raw['minConfidence'] ?? '')` |
| `apps/api/src/routes/admin.ts` | ⚠️ `item.attempt` corrected to `item.attempts` |

## Known Technical Debt Items

| Item | Location | Severity | Status |
|------|----------|----------|--------|
| Redis budget storage not default | `packages/llm/src/budget.ts` | MEDIUM | `RedisBudgetStorage` exists but `InMemoryBudgetStorage` is default; daily budget resets on restart |
| SIWF auth not implemented | `packages/auth/src/index.ts` | HIGH | Stub throws errors; real OAuth flow needed for production |
| Neynar auth not implemented | `packages/auth/src/index.ts` | HIGH | Stub throws errors; sign-up/login flow incomplete |
| In-memory rate limit store | `apps/api/src/middleware/security.ts` | MEDIUM | `rateLimitStore` Map resets on restart; concurrent bypass possible |
| In-memory daily counters | `packages/safety/src/rate-limiter.ts` | MEDIUM | `DailyCounter` resets on restart; plan limits not persistent |
| Webhook HMAC not verified | `apps/api/src/routes/webhook.ts` | MEDIUM | Neynar webhook signature not verified |
| No pagination UI | Admin pages | LOW | DataTable uses default 50-item limit; no cursor/offset controls |
| No loading skeletons | Admin pages | LOW | Some pages show empty state while loading |
| No E2E test on admin actions | `apps/web/e2e/app.spec.ts` | LOW | resolve/dismiss safety flags not tested |

## Mocked Pieces

- All items above are in the mocked/implemented-but-not-default category

## Live-Key-Required

None — all debt items are internal implementation quality issues.

## Blockers

1. **SIWF auth** — High priority blocker for production launch; without it only demo users can log in
2. **Redis budget** — Medium priority; daily budget resets mean users get full budget allocation on every restart

## Risks

1. **Auth stub at scale** — if real users try to sign up before SIWF is implemented, they cannot authenticate
2. **Rate limit bypass** — in-memory rate limit store allows concurrent requests to bypass limits before container restart
3. **Budget abuse** — without Redis persistence, a user could exhaust their daily budget, restart the API, and get a fresh budget

## Recommended Fixes

| Item | Fix | Priority |
|------|-----|----------|
| Redis budget | Set `PULO_BUDGET_STORAGE=redis` in `.env` | MEDIUM |
| SIWF auth | Implement `FarcasterAuthProvider` per `FARCASTER_AUTH_PLAN.md` | HIGH |
| Rate limit | Move store to Redis with `ioredis` | MEDIUM |
| Webhook HMAC | Verify `X-Neybar-Signature` header on webhook route | MEDIUM |
| Pagination UI | Add `page`/`cursor` controls to admin DataTable components | LOW |

## Commands

```bash
# Check which budget storage is active
grep -r "InMemoryBudgetStorage\|RedisBudgetStorage" packages/llm/src/

# Switch to Redis budget storage
echo "PULO_BUDGET_STORAGE=redis" >> .env
docker compose restart api

# Verify Redis is available
docker compose exec redis redis-cli ping
# Expected: PONG
```