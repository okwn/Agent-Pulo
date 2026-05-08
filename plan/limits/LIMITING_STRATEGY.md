# LIMITING_STRATEGY.md

## Rate Limit Tiers

| User Tier | Casts/Day | DMs/Day | Alerts | Thread Summaries |
|---|---|---|---|---|
| Free | 50 | 10 | 5 | 3 |
| Pro | 500 | 100 | 50 | 30 |
| Team | Unlimited | Unlimited | Unlimited | Unlimited |

## Implementation

### Redis-Backed Token Bucket

```typescript
// Per-FID rate limit check
async function checkRateLimit(fid: number, tier: string): Promise<boolean> {
  const limit = TIER_LIMITS[tier].castsPerDay;
  const key = `ratelimit:cast:${fid}`;
  const current = await redis.get(key);
  return (current ?? 0) < limit;
}
```

### Job Queue Limits

- Max concurrent jobs: 10
- Max queue depth: 1000
- Job timeout: 30 seconds
- Retry: 3 attempts with exponential backoff

### LLM Budget Controls

- Daily token budget per tier
- Per-request max tokens: 512
- Circuit breaker: open after 10 consecutive failures
- Fallback to cached responses if LLM unavailable

## Anti-Spam

- Block words list: configurable, loaded from DB
- Referred-by check: new accounts without prior casts blocked
- Velocity check: >5 casts in 1 minute → soft block
- Duplicate content detection: hash-based dedup within 5 minutes

## Resource Limits

- Worker memory: max 256MB per job
- Max cast length processed: 10,000 characters
- Max thread depth: 500 casts
- Image analysis: disabled for MVP (v2)