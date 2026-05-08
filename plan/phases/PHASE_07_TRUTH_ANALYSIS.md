# Phase 07: Truth Analysis

**Status:** Complete

## What was built

8-component truth analysis system for PULO, providing AI-powered fact-checking for on-chain content.

### Components

| Package | File | Purpose |
|---|---|---|
| `packages/truth` | `claim-extractor.ts` | Rule-based claim extraction |
| `packages/truth` | `evidence-collector.ts` | Fetches related casts via IFarcasterProvider |
| `packages/truth` | `reply-comment-analyzer.ts` | Analyzes reply sentiment |
| `packages/truth` | `source-trust-scorer.ts` | Scores source trust (official/high_trust/etc) |
| `packages/truth` | `contradiction-detector.ts` | Detects contradictions in evidence |
| `packages/truth` | `scam-signal-detector.ts` | Detects scam signals via @pulo/safety |
| `packages/truth` | `verdict-engine.ts` | Produces weighted verdict from all components |
| `packages/truth` | `report-formatter.ts` | Formats public reply (≤320 chars) and dashboard explanation |
| `packages/truth` | `intent-detector.ts` | Detects truth-check intent in EN/TR |
| `packages/truth` | `truth-checker.ts` | Main orchestrator combining all 8 components |
| `packages/truth` | `types.ts` | All core types and `TRUTH_CHECK_PATTERNS` |
| `packages/truth` | `index.ts` | Public API exports |

### API Routes

| File | Endpoints |
|---|---|
| `apps/api/src/routes/truth.ts` | `POST /api/truth/check`, `GET /api/truth/:id`, `GET /api/admin/truth-checks`, `POST /api/truth/detect-intent` |

### Database

- `packages/db/src/repositories/truth.ts` — `truthCheckRepository` with create/findById/findByUser/recent/pending/updateResult
- `packages/db/src/schema.ts` — `truthChecks` table with verdict enum, confidence, riskLevel, sourceCastHashes[]
- `packages/db/src/index.ts` — exports `truthCheckRepository` for API consumption

### UI Pages

| Path | Page |
|---|---|
| `/dashboard/truth` | User truth check dashboard with form + recent checks |
| `/dashboard/truth/[id]` | Individual truth check report detail |
| `/admin/truth-checks` | Admin table with verdict/risk filters + pagination |

### Documentation

| Path | Content |
|---|---|
| `plan/truth-analysis/TRUTH_ANALYSIS_SPEC.md` | Full spec with architecture, components, verdicts, scoring |
| `docs/architecture/TRUTH_ANALYSIS_FLOW.md` | 13-step flow diagram with interface details |
| `docs/api/TRUTH_API.md` | All 4 endpoint specs with request/response examples |
| `docs/errors/TRUTH_ERRORS.md` | Error codes, TypeScript gotchas, edge cases |

## TypeScript Fixes Applied

1. `intent-detector.ts`: Changed `TruthIntent` → `TruthCheckIntent` return type
2. `source-trust-scorer.ts`: Added `export type { SourceAssessment }` re-export
3. `evidence-collector.ts`: Changed `getCast()` → `getCastByHash()`, `searchResult` → `searchResult.results`
4. `truth-checker.ts`: Applied same IFarcasterProvider corrections
5. `claim-extractor.ts`: Added `!` non-null assertion on `scored[0]`
6. `index.test.ts`: Rewrote from old `truth.truth` API to new component-based tests
7. `apps/api/src/routes/truth.ts`: Fixed `truthCheckRepository` import path via `@pulo/db`, added `unknown` cast for `NormalizedEvent`, added explicit types to filter callbacks
8. `packages/db/src/index.ts`: Added `truthCheckRepository` export

## Tests

12 passing tests in `packages/truth/src/index.test.ts`:
- 6 intent detection tests (EN/TR patterns, confidence scoring)
- 3 claim extractor tests (factual claims, fallback, short text)
- 1 verdict engine test
- All TypeScript typecheck passes

## Acceptance Criteria Status

| Criteria | Status |
|---|---|
| 8 truth analysis components implemented | ✅ |
| 13-step truth_check workflow | ✅ |
| Turkish + English intent detection | ✅ |
| 6 verdict types | ✅ |
| Public reply ≤ 320 chars | ✅ |
| SafetyGate integration | ✅ |
| API: POST /api/truth/check | ✅ |
| API: GET /api/truth/:id | ✅ |
| API: GET /api/admin/truth-checks | ✅ |
| API: POST /api/truth/detect-intent | ✅ |
| Dashboard: /dashboard/truth | ✅ |
| Dashboard: /dashboard/truth/[id] | ✅ |
| Admin: /admin/truth-checks | ✅ |
| Docs: TRUTH_ANALYSIS_SPEC.md | ✅ |
| Docs: TRUTH_ANALYSIS_FLOW.md | ✅ |
| Docs: TRUTH_API.md | ✅ |
| Docs: TRUTH_ERRORS.md | ✅ |
| TypeScript clean build | ✅ |
| Tests passing | ✅ |

## Dependencies Added

- `apps/api/package.json`: Added `@pulo/truth` workspace dependency
- `apps/web/package.json`: Added `@pulo/truth` and `swr` workspace dependencies
- `packages/truth/package.json`: Added `@pulo/farcaster` and `@pulo/safety` dependencies

## Next Steps (Future Phases)

- **Phase 08:** Notification system (email/push for alerts)
- **Phase 09:** LLM integration for improved claim extraction and verdict reasoning
- **Phase 10:** Multi-chain support (extend beyond Ethereum)