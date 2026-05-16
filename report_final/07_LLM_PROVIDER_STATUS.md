# 07_LLM_PROVIDER_STATUS.md

## Status: ✅ Mock Ready | ✅ OpenAI/Anthropic Ready | ✅ AutoFallback Ready

## Evidence

| File | Status |
|------|--------|
| `packages/llm/src/index.ts` | ✅ All exports including `createForMode()` |
| `packages/llm/src/providers/auto-fallback.ts` | ✅ Cross-provider fallback |
| `packages/llm/src/budget.ts` | ✅ TokenBudgetGuard + InMemoryBudgetStorage |
| `packages/llm/src/prompts.ts` | ✅ `loadPrompt()` + `getPromptMetadata()` |
| `packages/llm/src/parser.ts` | ✅ `parseJsonOrRecover()` 4-strategy recovery |
| `packages/llm/src/index.test.ts` | ✅ 43 tests passing |

## Modes

| Mode | Env | Keys Required |
|------|-----|---------------|
| `mock` | `PULO_LLM_MODE=mock` | None |
| `openai` | `PULO_LLM_MODE=openai` | `OPENAI_API_KEY` |
| `anthropic` | `PULO_LLM_MODE=anthropic` | `ANTHROPIC_API_KEY` |
| `auto` | `PULO_LLM_MODE=auto` + `PULO_AUTO_PRIMARY` | Both OpenAI + Anthropic |
| `local` | `PULO_LLM_MODE=local` | Placeholder |

## Working Pieces

- `MockLlmProvider` — returns structured mock responses, no API call
- `OpenAIProvider` — GPT-4o/GPT-4o-mini, proper timeout/retry
- `AnthropicProvider` — Claude, same behavior
- `AutoFallbackLlmProvider` — primary fails → fallback, records `fallbackHistory`
- Token budget: `TokenBudgetGuard.checkUserBudget()`, `enforceOrThrow()`
- Prompt versioning: 10 prompt templates with `outputSchema`, `safetyNotes`, `minConfidence`
- Structured output: `parseJsonOrRecover()` with 4 strategies

## Mocked Pieces

- All LLM calls return mock structured data in mock mode
- Token budget uses `InMemoryBudgetStorage` (not Redis)

## Live-Key-Required

| Mode | Keys |
|------|------|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `auto` | Both + `PULO_AUTO_PRIMARY=openai\|anthropic` |

## Blockers

None. Mock mode fully functional.

## Risks

1. **Daily budget reset** — in-memory resets on process restart; set `PULO_BUDGET_STORAGE=redis` for persistence
2. **Context length** — `LLM_CONTEXT_LIMIT_EXCEEDED` not retryable; check before sending
3. **Cost overspend** — `PULO_DAILY_LLM_COST_LIMIT_USD` defaults to $5; monitor via `/metrics`

## Commands

```bash
# Test mock composer
curl -X POST http://localhost:4311/api/composer/rewrite \
  -H "Content-Type: application/json" \
  -d '{"text":"test cast","style":"concise"}'
# → Mock response in mock mode

# Switch to live
PULO_LLM_MODE=openai
OPENAI_API_KEY=sk-...
docker compose restart api

# Test with live LLM
curl -X POST http://localhost:4311/api/composer/rewrite \
  -H "Content-Type: application/json" \
  -d '{"text":"make this better","style":"founder"}'
# → Real GPT-4o response
```