# 06_SAFETY_LIMITS_STATUS.md

## Status: ✅ Safety Gate Implemented | Plan Limits Enforced

## Evidence

| File | Status |
|------|--------|
| `packages/safety/src/gate.ts` | ✅ `SafetyGate.check()` → block/review/allow |
| `packages/safety/src/thresholds.ts` | ✅ Configurable risk thresholds |
| `packages/billing/src/limits.ts` | ✅ `checkLimit()`, `getPlanLimits()` |
| `apps/api/src/routes/billing.ts` | ✅ GET /api/billing/usage, GET /api/billing/plan |
| `apps/api/src/middleware/rate-limit.ts` | ✅ Rate limit enforcement |

## Working Pieces

- SafetyGate: block (threshold exceeded), review (uncertain), allow (safe)
- Plan tiers: free/pro/creator/community/admin with different limits
- Free plan: 5 truth checks/day, 3 radar alerts/day
- Pro plan: unlimited truth checks, 50 radar alerts/day
- Rate limiting: per-FID, per-endpoint, configurable via env

## Safety Threshold Configuration

```env
PULO_SAFETY_THRESHOLD=0.7    # Block at 70% risk score
PULO_SCAM_THRESHOLD=0.5       # Block scam at 50% confidence
```

## Blockers

None. Safety and limits work in mock mode.

## Risks

1. **Threshold tuning** — `PULO_SAFETY_THRESHOLD=0.7` may be too aggressive or too lenient; monitor `/admin/safety`
2. **Rate limit race** — concurrent requests from same FID could bypass; Redis lock recommended for production
3. **Free tier reset** — daily reset is in-memory; process restart clears accumulated counts

## Commands

```bash
# Check usage
curl http://localhost:4311/api/billing/usage \
  -H "Cookie: pulo_demo_session=..."

# Attempt truth check (free user at limit)
curl -X POST http://localhost:4311/api/truth \
  -H "Content-Type: application/json" \
  -d '{"castHash":"test"}'
# Expected: 429 PLAN_LIMIT_EXCEEDED
```