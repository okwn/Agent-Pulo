# MODEL_ROUTER.md — Model Selection by Run Type

**Status:** Complete

## Overview

`ModelRouter` selects the appropriate LLM model for each agent run type, supporting four modes: `mock`, `openai`, `anthropic`, `local`.

## Model Configuration

Located in `packages/llm/src/types.ts`:

| Key | Model ID | Tier | Input Tokens | Output Tokens | $/M Input | $/M Output |
|---|---|---|---|---|---|---|
| `gpt-4o` | `gpt-4o-2024-05-13` | large | 128,000 | 16,384 | $5.00 | $15.00 |
| `gpt-4o-mini` | `gpt-4o-mini-2024-07-18` | small | 128,000 | 16,384 | $0.15 | $0.60 |
| `claude-sonnet` | `claude-sonnet-4-20250514` | large | 200,000 | 8,192 | $3.00 | $15.00 |
| `claude-haiku` | `claude-haiku-4-20250514` | small | 200,000 | 4,096 | $0.25 | $1.25 |

## Run Type → Model Mapping

| Run Type | Model Tier | Default Model |
|---|---|---|
| `intent_classification` | small | `gpt-4o-mini` |
| `farcaster_reply` | large | `gpt-4o` |
| `cast_summary` | small | `gpt-4o-mini` |
| `thread_summary` | large | `gpt-4o` |
| `truth_check_claim_extraction` | small | `gpt-4o-mini` |
| `truth_check_verdict` | large | `gpt-4o` |
| `trend_cluster_summary` | small | `gpt-4o-mini` |
| `risk_analysis` | large | `gpt-4o` |
| `alert_message` | small | `gpt-4o-mini` |
| `admin_summary` | small | `gpt-4o-mini` |
| `reply_suggestion` | small | `gpt-4o-mini` |
| `cast_rewrite` | large | `gpt-4o` |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PULO_LLM_MODE` | `mock` | Operating mode |
| `PULO_DEFAULT_SMALL_MODEL` | `gpt-4o-mini` | Override small model |
| `PULO_DEFAULT_LARGE_MODEL` | `gpt-4o` | Override large model |

## Usage

```typescript
import { createRouter } from '@pulo/llm';

const router = createRouter();
const modelId = router.modelForRunType('farcaster_reply');
// → 'gpt-4o-2024-05-13' (or configured default)

const isLarge = router.isLargeModel('truth_check_verdict');
// → true
```

## Mode Switching

```typescript
import { createForMode } from '@pulo/llm';

const client = createForMode('anthropic');
// Uses CLAUDE_API_KEY, routes by run type
```

## Provider Selection by Mode

| Mode | Provider | Environment Variable |
|---|---|---|
| `openai` | `OpenAiProvider` | `PULO_OPENAI_API_KEY` |
| `anthropic` | `AnthropicProvider` | `PULO_ANTHROPIC_API_KEY` |
| `local` | `LocalLlmProvider` | `PULO_LOCAL_LLM_URL` |
| `mock` | `MockLlmProvider` | none |
