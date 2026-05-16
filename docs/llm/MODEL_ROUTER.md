# MODEL_ROUTER.md — LLM Model Selection

**Status:** Complete

## Overview

`ModelRouter` selects the appropriate model ID for a given run type based on mode and model tier configuration.

## Modes

| Mode | Description |
|------|-------------|
| `mock` | MockLlmProvider — no API keys needed |
| `openai` | OpenAI GPT-4o/GPT-4o-mini |
| `anthropic` | Anthropic Claude Haiku/Sonnet |
| `local` | Local/self-hosted (placeholder) |
| `auto` | AutoFallbackLlmProvider — primary + fallback |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PULO_LLM_MODE` | `mock` | Provider mode |
| `PULO_DEFAULT_SMALL_MODEL` | `gpt-4o-mini` | Small model key |
| `PULO_DEFAULT_LARGE_MODEL` | `gpt-4o` | Large model key |
| `PULO_AUTO_PRIMARY` | `openai` | Primary for auto mode |

## Run Type → Model Mapping

| Run Type | Tier | Default Model |
|----------|------|--------------|
| `intent_classification` | small | gpt-4o-mini |
| `farcaster_reply` | large | gpt-4o |
| `cast_summary` | small | gpt-4o-mini |
| `thread_summary` | large | gpt-4o |
| `truth_check_claim_extraction` | small | gpt-4o-mini |
| `truth_check_verdict` | large | gpt-4o |
| `trend_cluster_summary` | small | gpt-4o-mini |
| `risk_analysis` | large | gpt-4o |
| `alert_message` | small | gpt-4o-mini |
| `admin_summary` | small | gpt-4o-mini |
| `reply_suggestion` | small | gpt-4o-mini |
| `cast_rewrite` | large | gpt-4o |

## Usage

```typescript
import { createRouter, modelRouter } from '@pulo/llm';

const router = createRouter();
const modelId = router.modelForRunType('farcaster_reply');
```