# 04_TRUTH_ANALYSIS_STATUS.md

## Status: ✅ Mock Ready | ⚠️ Live Search Needs Key

## Evidence

| File | Status |
|------|--------|
| `packages/truth/src/index.ts` | ✅ `analyzeClaim()`, `extractClaims()` |
| `packages/truth/src/verdict.ts` | ✅ 6-tier verdict: verified→debunked |
| `packages/truth/src/safety-check.ts` | ✅ Spam/risk assessment |
| `apps/api/src/routes/truth.ts` | ✅ GET /api/truth/:castHash |
| `apps/api/src/routes/truth-check.ts` | ✅ POST truth-check with web search |

## Working Pieces

- Claim extraction from cast text (no external call)
- 6-tier verdict classification (verified/likely_true/uncertain/likely_false/debunked/unverified)
- Mock web search returns empty results (no live API)
- Safety check flags suspicious links

## Mocked Pieces

- `TruthWebSearch` — mock returns no results; truth check runs on cast text only
- Evidence collection — no Tavily/SerpAPI calls in mock mode

## Live-Key-Required

| Item | Key | Env |
|------|-----|-----|
| Tavily search | `TAVILY_API_KEY` | `PULO_SEARCH_MODE=tavily` |
| SerpAPI search | `SERPAPI_API_KEY` | `PULO_SEARCH_MODE=serpapi` |

## Blockers

None. Truth analysis works in mock mode without keys.

## Risks

1. **Web search quality** — Tavily results depend on query phrasing; may need prompt tuning
2. **Verdict confidence** — low-confidence verdicts (45-55%) may need human review; `/admin/truth-checks` for review

## Commands

```bash
# Test in mock mode (no keys needed)
curl http://localhost:4311/api/truth/demo_cast_token_claim_001

# Switch to live search
PULO_SEARCH_MODE=tavily
TAVILY_API_KEY=your_key
docker compose restart api
```