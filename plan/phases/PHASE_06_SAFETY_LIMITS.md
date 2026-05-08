# PHASE_06_SAFETY_LIMITS.md — Safety and Plan Limits Layer

**Status:** Completed 2026-05-08
**Deliverables:** 14 source files, 3 security docs, 2 plan docs, 44 passing tests

## What Was Built

### Source Files (packages/safety/src/)

| File | Purpose |
|---|---|
| `types.ts` | SafetyResult, SafetyBlock, SafetyFlag (15 types), SafetyAction (7 types), UserPlan/PLAN_LIMITS (4 tiers), UserConsents, SafetyContext, RiskAssessment, all keyword lists |
| `errors.ts` | SafetyBlockError with flag/reason/userFacingMessage/JSON serialization |
| `rate-limiter.ts` | RateLimiter (token bucket), FixedWindowRateLimiter, DailyCounter |
| `plan-limits.ts` | checkPlanLimit/enforcePlanLimit/recordAction/getUsageCount/getPlanLimitForAction |
| `safety-gate.ts` | SafetyGate orchestrator — runs all 11 guards in sequence |
| `guards/consent.guard.ts` | enforceConsent/checkConsent/defaultConsents |
| `guards/cooldown.guard.ts` | SameAuthorCooldownGuard (30s), SameCastCooldownGuard (60s), ChannelCooldownGuard (10s) |
| `guards/duplicate-reply.guard.ts` | DuplicateReplyGuard with in-flight + processed state |
| `guards/scam-risk.guard.ts` | ScamRiskGuard with keyword scoring (15+ keywords), risk levels, claim guidance |
| `guards/financial-advice.guard.ts` | FinancialAdviceGuard (price predictions, guaranteed returns) |
| `guards/toxicity.guard.ts` | Placeholder toxicity guard (TODO: Perspective API) |
| `guards/political.guard.ts` | Placeholder political content guard |
| `guards/private-data.guard.ts` | PrivateDataGuard — blocks seed phrases, private keys, raw hex |
| `guards/link-risk.guard.ts` | LinkRiskGuard — blocks shorteners, IP URLs, data: URIs, @ URLs |
| `guards/auto-publish.guard.ts` | AutoPublishGate — confidence + risk + official source gates |
| `guards/index.ts` | Re-exports all guards |
| `index.ts` | Full public API |
| `index.test.ts` | 44 tests covering all guards and SafetyGate integration |

### Documentation (docs/security/)

| File | Purpose |
|---|---|
| `SAFETY_MODEL.md` | Guard architecture, plan tiers, scam scoring, consent model |
| `ABUSE_PREVENTION.md` | Rate limits, cooldowns, duplicate detection, logging |
| `CLAIM_AND_AIRDROP_RISK_POLICY.md` | Claim content rules, verification levels, allowed/blocked language |

### Plan Files

| File | Purpose |
|---|---|
| `plan/safety/SAFETY_MATRIX.md` | Guard × action matrix, risk thresholds, flag reference |
| `plan/limits/PLAN_LIMITS.md` | Per-plan limits, upgrade messaging, usage tracking |

## Architecture

```
SafetyGate
  ├── 1. PlanLimitsGuard → daily counter check
  ├── 2. ConsentGuard → direct_cast / mini_app / auto_publish
  ├── 3. DuplicateReplyGuard → in-flight + processed dedup
  ├── 4. SameAuthorCooldownGuard (30s)
  ├── 5. SameCastCooldownGuard (60s)
  ├── 6. ChannelCooldownGuard (10s)
  ├── 7. PrivateDataGuard → blocks keys/seeds
  ├── 8. FinancialAdviceGuard → blocks price predictions
  ├── 9. LinkRiskGuard → blocks shorteners, IP URLs, data: URIs
  ├── 10. ScamRiskGuard → keyword + urgency scoring
  └── 11. AutoPublishGate → confidence + risk + official source
```

## Key Design Decisions

1. **SafetyBlockError carries user-facing message** — UI can display it directly
2. **Every block has a flag** — machine-readable, dashboard-indexable
3. **Consent defaults to false** — explicit opt-in for all auto-actions
4. **Scam risk is scored** — not a simple keyword block, multiple signals combine
5. **Auto-publish is triple-gated** — consent + risk + confidence + official source
6. **Private data is checked first** — before any other content processing (security critical)
7. **Daily counters reset at midnight UTC** — via date key in DailyCounter
8. **All blocks are logged** — at warn level with full context

## Environment Variables

None for the safety package itself — limits are enforced in-memory. For production persistence, the `DailyCounter` would need a Redis backend (TODO).

## Phase 7 Preview: Job Queue Integration

Next: packages/job-queue — BullMQ job processor connecting agent-core pipeline to farcaster event stream, with graceful shutdown, dead-letter queue, and health endpoints.
