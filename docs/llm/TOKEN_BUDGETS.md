# TOKEN_BUDGETS.md — Token Budget Enforcement

## Architecture

```
TokenBudgetGuard
├── InMemoryBudgetStorage (tests/dev, no external deps)
└── RedisBudgetStorage (production, lazy-loaded via budget-redis.ts)
```

## Token Budget Guard

`TokenBudgetGuard.checkRequest()` enforces:
1. **Per-request input token limit** — rejects input exceeding model's context window
2. **Per-request output token limit** — rejects output exceeding configured max
3. **Daily cost budget** — rejects if estimated daily cost would exceed limit

## Storage Backends

### In-Memory (`InMemoryBudgetStorage`)
- Module-level `_dailyAccumulator` with date-stamped reset
- Per-user Map storage
- **No network dependencies** — always available
- Use for: tests, local dev, any non-production environment

### Redis (`RedisBudgetStorage`)
- Lazy-loaded (ioredis imported only at runtime when URL is set)
- Keys: `llm:budget:{YYYY-MM-DD}:user:{userId}` and `llm:budget:{YYYY-MM-DD}:global`
- 24-hour TTL
- Gracefully degrades if Redis unavailable
- Use for: production with Redis available

## Per-User Budget

```typescript
const guard = new TokenBudgetGuard({
  dailyLimitUsd: 5.0,
  maxInputTokens: 128_000,
  maxOutputTokens: 16_384,
  storage: new RedisBudgetStorage(process.env.REDIS_URL!),
});

const result = await guard.checkUserBudget(userId, estimatedCostUsd);
if (!result.allowed) throw new Error('User budget exceeded');
```

## Cost Estimation

```typescript
const { inputTokens, outputTokens, costUsd } = estimateRequestCost(
  messages,
  'gpt-4o-mini',
  500 // estimated output tokens
);
```

Uses character-count ÷ 4 ≈ token estimate, then multiplies by model's per-million rates.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PULO_DAILY_LLM_COST_LIMIT_USD` | `5.0` | Daily cost ceiling |