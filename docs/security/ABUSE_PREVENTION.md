# ABUSE_PREVENTION.md — Abuse Prevention and Anti-Spam

**Status:** Complete

## Anti-Spam Philosophy

PULO must never become a spam bot. Every outbound action is gated by multiple layers of protection.

## Rate Limiting

### Token Bucket (in-memory)
- **Fast actions**: 10 req/s per user for `reply`
- **Medium actions**: 2 req/s for `mention_analysis`
- **Slow actions**: 1 req/s for `direct_cast`

### Daily Counters (persistent)
- `mention_analysis`: 5/day (free) → 500/day (creator)
- `reply_suggestion`: 3/day (free) → 100/day (creator)
- `radar_alert`: 1/day (free) → 30/day (creator)

## Spam Patterns Blocked

### Cooldown Guards
| Guard | Window | Trigger |
|---|---|---|
| SameAuthorCooldownGuard | 30s | Multiple replies to same author |
| SameCastCooldownGuard | 60s | Multiple replies to same cast |
| ChannelCooldownGuard | 10s | Rapid channel messages |

### Duplicate Detection
- **In-flight**: Prevents processing the same cast+user combo twice simultaneously
- **Processed**: In-memory set prevents re-processing within session
- **DB dedupe**: `wasProcessed()` check against `agent_runs` table

## Content-Based Anti-Abuse

### Scam Detection
Scored keyword approach — not a simple blocklist:
- Multiple low-confidence signals combine into risk level
- Only critical (≥0.7) is hard-blocked
- High (0.5–0.7) is flagged but allowed

### Financial Advice Blocks
Patterns that predict prices or recommend trades are blocked outright:
- `price will X`
- `buy now` / `sell now`
- `guaranteed return`
- `this token will 10x`

### Link Safety
URL shorteners and IP URLs are blocked. They are commonly used in phishing because they obscure the final destination.

## User-Facing Behavior

| Scenario | User Sees |
|---|---|
| Daily limit reached | "You've reached your daily limit. Upgrade to Pro for more." |
| Duplicate reply | "You already replied to this cast." |
| Cooldown active | "Please wait X seconds before replying again." |
| No consent for direct cast | "Direct cast alerts require your opt-in." |
| Scam risk detected | "This content has been flagged as potentially risky." |
| Private data detected | "Never share private keys or seed phrases." |
| Unverified claim | "This claim is unverified. Verify before engaging." |

## Logging

All blocked actions are logged with full context:
```json
{
  "level": "warn",
  "component": "safety-gate",
  "err": { "flag": "SCAM_RISK", "reason": "...", "confidence": 0.95 },
  "ctx": { "userId": 123, "action": "reply", "castHash": "0x..." },
  "msg": "scam risk block"
}
```

Admin plan logs ALL actions, not just blocks.

## Recovery

When PULO is rate-limited or blocked:
1. Request returns `SafetyBlockError` with user-facing message
2. Agent gracefully degrades — no crash
3. Block reason is surfaced to user in UI
4. Admin dashboard can view all safety flags
