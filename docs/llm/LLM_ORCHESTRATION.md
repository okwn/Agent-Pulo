# LLM_ORCHESTRATION.md

## Model Selection

| Task | Model | Justification |
|---|---|---|
| Reply generation | `gpt-4o-mini` | Fast, cost-effective, sufficient quality |
| Truth analysis | `claude-haiku-4` | Strong reasoning, lower cost than Opus |
| Spam detection | Rule engine / DistilBERT | Fast, local, no API cost |
| Thread summarization | `gpt-4o-mini` | Consistent with reply generation |
| Keyword extraction | `gpt-4o-mini` | Fast, reliable |

## Fallback Chain

```
Primary (OpenAI GPT-4o mini)
    ↓ [failure / timeout]
Secondary (Anthropic Claude Haiku)
    ↓ [failure / timeout]
Return error response (no silent failure)
```

## Request Configuration

| Model | Max Tokens | Temperature | Timeout |
|---|---|---|---|
| gpt-4o-mini | 512 | 0.7 | 15s |
| claude-haiku-4 | 1024 | 0.5 | 20s |

## Prompt Engineering

All prompts are stored in `/packages/prompts/` as versioned files. No inline prompt strings in code.

## Cost Management

- Daily token budget per tier (see LIMITING_STRATEGY.md)
- Per-request max tokens enforced at orchestration layer
- Cache hits reduce actual API calls (Redis, 1hr TTL)

## Evaluation

- Monthly eval on truth analysis accuracy (golden dataset)
- Reply quality tracked via user feedback (thumbs up/down)
- LLM call latency tracked in Prometheus