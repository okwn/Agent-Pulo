# FALLBACK_POLICY.md — LLM Provider Fallback

## Auto Mode (`PULO_LLM_MODE=auto`)

`AutoFallbackLlmProvider` wraps two live providers and attempts cross-provider fallback when the primary fails.

## Fallback Flow

```
Request
  │
  ▼
Primary Provider (OpenAI or Anthropic)
  │
  ├─ Success → return response with provider field
  │
  └─ Retryable Error
          │
          ▼
      Fallback Provider
          │
          ├─ Success → return response with fallbackHistory
          │
          └─ Error → throw LlmError with fallbackHistory attached
```

## Provider Selection

| Condition | Primary | Fallback |
|----------|---------|---------|
| `PULO_AUTO_PRIMARY=openai` + OpenAI key exists | OpenAI | Anthropic |
| `PULO_AUTO_PRIMARY=anthropic` + Anthropic key exists | Anthropic | OpenAI |
| Neither key exists | mock (mock fallback) | mock |

## FallbackRecord Schema

```typescript
interface FallbackRecord {
  attemptedProvider: string;  // 'openai' | 'anthropic' | 'mock'
  attemptedModel: string;
  errorCode: string;         // 'API_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | etc.
  errorMessage: string;
  recovered: boolean;        // false (never self-heals within same provider)
}
```

## Error Codes

| Code | Meaning | Retryable |
|------|---------|-----------|
| `TIMEOUT` | Request timed out | Yes |
| `RATE_LIMIT` | Provider rate limit hit | Yes |
| `API_ERROR` (5xx) | Server-side error | Yes |
| `API_ERROR` (4xx) | Client error | No |
| `CONTEXT_LENGTH` | Input exceeds model limit | No |
| `ALL_PROVIDERS_FAILED` | Both providers failed | No |

## Safe Failure Guarantees

- **Never silently hide failures** — `fallbackHistory` is always attached to error responses
- **Never fallback on non-retryable errors** — context length, auth failures do not trigger fallback
- **Mock fallback when no keys** — `AutoFallbackLlmProvider` always returns a usable provider
- **Fallback history recorded** — `agent_runs.fallback_history` stores the full sequence

## agent_runs Schema

```sql
provider        text,   -- openai | anthropic | mock | auto
model           text,   -- model id used
prompt_version  text,   -- e.g. "1.0.0"
fallback_history jsonb -- array of FallbackRecord
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PULO_LLM_MODE` | `mock` | Set to `auto` to enable |
| `PULO_AUTO_PRIMARY` | `openai` | Primary provider |
| `PULO_OPENAI_API_KEY` | — | OpenAI key |
| `PULO_ANTHROPIC_API_KEY` | — | Anthropic key |