# PHASE_05_LLM.md — LLM Provider Abstraction Layer

**Status:** Completed 2026-05-08
**Deliverables:** 17 source files, 10 prompt templates, 3 docs, 21 passing tests

## What Was Built

### Source Files (packages/llm/src/)

| File | Purpose |
|---|---|
| `types.ts` | LlmMode, ModelConfig (4 models), LlmMessage/Request/Response/Usage, all error types, RUN_TYPE_MODEL_MAP |
| `providers/base.ts` | `BaseLlmProvider` abstract class + `LlmProvider` interface |
| `providers/openai.ts` | `OpenAiProvider` using OpenAI SDK with JSON structured output |
| `providers/anthropic.ts` | `AnthropicProvider` using Anthropic SDK |
| `providers/mock.ts` | `MockLlmProvider` with `registerMock`/`setMockResponse`, `findMockKey` pattern matching, 10 default responses |
| `providers/local.ts` | `LocalLlmProvider` placeholder (NOT_IMPLEMENTED) |
| `providers/index.ts` | Re-exports all providers |
| `router.ts` | `ModelRouter` with `modelForRunType()`, `isLargeModel()`, `availableModels()`, `createRouter()` from env |
| `budget.ts` | `estimateRequestCost()`, daily `CostAccumulator`, `TokenBudgetGuard` with `checkRequest()`/`enforceOrThrow()`/`recordUsage()` |
| `retry.ts` | `withRetry()` with exponential backoff for retryable errors |
| `parser.ts` | `parseJsonOrRecover()` with 3 recovery strategies (code block, JSON extraction, trailing comma fix) |
| `llm.ts` | `LlmClient` tying provider + router + budget + retry, `createLlmClient()`, `createForMode()` |
| `prompts.ts` | `loadPrompt()`, `listPromptVersions()`, YAML frontmatter parsing, `{{variable}}` template rendering |
| `index.ts` | Public API re-exporting all public surface area |
| `index.test.ts` | 21 tests covering MockLlmProvider, parseJsonOrRecover, estimateRequestCost, TokenBudgetGuard, withRetry, MODEL_CONFIGS |

### Prompt Templates (packages/llm/prompts/)

| File | Run Type | Model |
|---|---|---|
| `intent_classifier.md` | intent_classification | small |
| `farcaster_reply.md` | farcaster_reply | large |
| `cast_summary.md` | cast_summary | small |
| `thread_summary.md` | thread_summary | large |
| `truth_check_claim_extraction.md` | truth_check_claim_extraction | small |
| `truth_check_verdict.md` | truth_check_verdict | large |
| `trend_cluster_summary.md` | trend_cluster_summary | small |
| `risk_analysis.md` | risk_analysis | large |
| `alert_message.md` | alert_message | small |
| `admin_summary.md` | admin_summary | small |

### Documentation (docs/llm/)

| File | Purpose |
|---|---|
| `PROMPT_LIBRARY.md` | Prompt loading, versioning, variable substitution |
| `MODEL_ROUTER.md` | Model configs, run type → model mapping, env vars |
| `TRUTH_CHECK_PROMPTING.md` | Two-step truth check prompt engineering guide |

## Architecture

```
LlmClient
  ├── provider: BaseLlmProvider (OpenAI | Anthropic | Mock | Local)
  ├── router: ModelRouter (selects model by run type)
  ├── budgetGuard: TokenBudgetGuard (daily cost + token limits)
  └── retry: withRetry (exponential backoff for retryable errors)
```

## Key Design Decisions

1. **Provider-agnostic**: All providers implement `LlmProvider` interface — swap by mode
2. **JSON structured output**: All providers return parsed Zod objects, no raw text
3. **Mock always available**: `MockLlmProvider` enables full stack testing without API keys
4. **Budget guard first**: `enforceOrThrow()` runs before any API call to avoid wasted spend
5. **Daily accumulator resets**: `resetDailyAccumulatorsIfNewDay()` prevents stale state
6. **Recovery-first parser**: `parseJsonOrRecover()` tries 3 strategies before throwing
7. **Retryable errors**: Only `LlmTimeoutError` and `LlmRateLimitError` trigger retry

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PULO_LLM_MODE` | `mock` | Provider mode |
| `PULO_DAILY_LLM_COST_LIMIT_USD` | `5.0` | Daily cost cap |
| `PULO_OPENAI_API_KEY` | — | OpenAI API key |
| `PULO_ANTHROPIC_API_KEY` | — | Anthropic API key |
| `PULO_LOCAL_LLM_URL` | — | Local LLM base URL |
| `PULO_DEFAULT_SMALL_MODEL` | `gpt-4o-mini` | Override small model |
| `PULO_DEFAULT_LARGE_MODEL` | `gpt-4o` | Override large model |

## Phase 6 Preview: Job Queue Integration

Next: packages/job-queue — BullMQ job processor connecting agent-core pipeline to farcaster event stream, with graceful shutdown, dead-letter queue, and health endpoints.
