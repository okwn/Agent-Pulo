# Mention Bot Flow — @pulo Integration

## Overview

The Mention Bot listens for @pulo mentions on Far caster, routes them through the agent orchestrator, and publishes short public replies.

## Supported Commands

| Command | Intent | Plan Required | Safety Sensitive |
|---------|--------|---------------|-----------------|
| `@pulo summarize` | thread_summary | Pro+ | No |
| `@pulo summarize this thread` | thread_summary | Pro+ | No |
| `@pulo explain this` | cast_summary | Any | No |
| `@pulo is this true?` | truth_check | Pro+ | Yes |
| `@pulo bu doğru mu?` | truth_check (TR) | Pro+ | Yes |
| `@pulo scam mı?` | risk_analysis | Any | Yes |
| `@pulo source?` | cast_summary | Any | No |
| `@pulo give me a smart reply` | reply_suggestion | Any | No |
| `@pulo give me a banger reply` | reply_suggestion | Any | No |
| `@pulo make this clearer` | cast_rewrite | Any | No |
| `@pulo turn this into a thread` | thread_summary | Pro+ | No |
| `@pulo rate this cast` | cast_summary | Any | No |
| `@pulo alpha?` | cast_summary | Any | No |
| `@pulo what should I reply?` | reply_suggestion | Any | No |
| `@pulo translate to Turkish` | cast_rewrite | Any | No |
| `@pulo translate to English` | cast_rewrite | Any | No |

## Flow

```
Incoming mention webhook ( Neynar)
    ↓
verifyAndNormalizeMention() — signature verification
    ↓
enqueueMention() → BullMQ queue 'pulo-mentions'
    ↓
startMentionWorker() — process job
    ├─ verifyAndNormalizeMention() again (idempotent)
    ├─ checkMentionIdempotency() — skip duplicates
    ├─ agentOrchestrator.process()
    │   ├─ dedupe
    │   ├─ identifyActor + loadPreferences + planLimits
    │   ├─ mentionCommandRouter.route() — detect command
    │   ├─ intentClassifier.classifyGenericMention() — fallback
    │   ├─ contextBuilder.build()
    │   ├─ safety precheck
    │   ├─ decisionEngine.decide()
    │   ├─ safety postcheck
    │   ├─ actionExecutor.execute()
    │   └─ agentRunLogger.logCompletion()
    ├─ publicReplyFormatter.format() — truncate to ≤320 chars
    ├─ publishMentionReply() — idempotent via reply:{runId}
    ├─ saveReplyDraft() — if publish failed + requiresApproval
    └─ logMentionDelivery() — record to alertDeliveries
```

## Safety Rules

- Claims with `$`, `airdrop`, `token`, `launch` patterns get safety warnings in replies
- Scam-check command (`scam mı?`) always adds "verify source" disclaimer
- Truth checks for free users get "Pro users get instant verdicts" CTA
- High-risk claims never receive overconfident truth statements

## Public Reply Rules

1. Max 320 characters (Farcaster limit)
2. Never promise definitive truth on unverified claims
3. Always include dashboard CTA for complex operations
4. Free users get short answers + upgrade CTA
5. Pro users get richer analysis + dashboard link

## Idempotency

- Webhook: same `event.hash` processed once per runId
- Publish: `reply:{runId}` idempotency key prevents double-post
- Draft: `draft:{event.hash}` prevents duplicate draft creation

## Retry Policy

BullMQ job retry: 3 attempts, exponential backoff (5s base). After 3 failures, job is marked as failed and visible in `/admin/events`.

## Queue Configuration

```
Queue: pulo-mentions
Connection: Redis (same as radar.scan)
Attempts: 3
Backoff: exponential, 5000ms base
```
