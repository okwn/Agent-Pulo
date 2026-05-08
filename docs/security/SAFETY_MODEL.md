# SAFETY_MODEL.md — Safety and Abuse Prevention Model

**Status:** Complete

## Overview

PULO implements safety as a first-class product layer. Safety is enforced through a `SafetyGate` that runs every agent action through multiple independent guards before execution.

## Guard Architecture

```
SafetyGate.runOrThrow(context)
  ├── 1. PlanLimitsGuard — daily quota enforcement
  ├── 2. ConsentGuard — user permission verification
  ├── 3. DuplicateReplyGuard — in-memory + processed dedup
  ├── 4. SameAuthorCooldownGuard — 30s between same-author replies
  ├── 5. SameCastCooldownGuard — 60s between same-cast replies
  ├── 6. ChannelCooldownGuard — 10s between channel messages
  ├── 7. PrivateDataGuard — blocks seed phrases, private keys
  ├── 8. FinancialAdviceGuard — blocks price predictions
  ├── 9. LinkRiskGuard — blocks URL shorteners, IP URLs, data: URIs
  ├── 10. ScamRiskGuard — keyword + urgency + guarantee scoring
  └── 11. AutoPublishGate — confidence + risk + official source check
```

## Plan Tiers

| Feature | FREE | PRO | CREATOR | ADMIN |
|---|---|---|---|---|
| Mention analyses/day | 5 | 100 | 500 | ∞ |
| Reply suggestions/day | 3 | 50 | 100 | ∞ |
| Radar alerts/day | 1 | 10 | 30 | ∞ |
| Direct cast alerts | No | Opt-in | Opt-in | Yes |
| Mini-app notifications | No | Yes | Yes | Yes |
| Auto-publish | No | No | No | Yes |
| Action logging | No | No | No | All |

## Consent Model

All notifications and auto-actions require **explicit opt-in**. Default consents are all `false`.

```typescript
interface UserConsents {
  directCast: boolean;          // Direct cast alerts
  miniAppNotifications: boolean; // Push notifications
  autoPublish: boolean;         // Auto-post without review
  trendAlerts: boolean;         // Trend radar alerts
  truthCheckAlerts: boolean;    // Truth check notifications
}
```

## Scam Risk Scoring

| Signal | Score |
|---|---|
| Scam keyword match | +0.3 |
| Urgency language | +0.2 |
| Guarantee language | +0.15 |
| Wallet/transfer request | +0.35 |
| URL shortener | +0.2 |
| Caution keyword (airdrop, claim, token) | +0.1 each |

**Risk Levels:**
- `low`: score < 0.3
- `medium`: 0.3 ≤ score < 0.5
- `high`: 0.5 ≤ score < 0.7
- `critical`: score ≥ 0.7 (blocked)

## Claim Response Guidance

When content mentions airdrops, token claims, or rewards:

| Claim Confidence | Official Source | Guidance |
|---|---|---|
| < 0.7 | No | `unverified` — do not share |
| 0.7–0.85 | No | `verify_first` — check before posting |
| < 0.85 | Yes | `cautious` — require verification |
| ≥ 0.85 | Yes | `safe` |

## Block Reasons

Every `SafetyBlockError` includes:
- `flag`: Machine-readable code (e.g., `SCAM_RISK`, `CONSENT_REQUIRED`)
- `reason`: Technical description
- `userFacingMessage`: Human-readable message for UI
- `confidence`: Model confidence 0–1

## Auto-Publish Requirements

1. Consent must be `true`
2. Risk level must be `low`
3. LLM confidence ≥ 0.8
4. For financial claims: `isOfficialSource === true`

## Private Data Patterns

Blocked patterns:
- `private_key` / `private-key`
- `seed_phrase` / `seed-phrase`
- `secret_phrase` / `secret-phrase`
- Raw hex private keys (64 chars, 0x prefix)

## Link Risk Patterns

Blocked:
- URL shorteners (bit.ly, tinyurl, etc.)
- IP-based URLs
- Non-standard ports
- `data:` URIs
- `@` in URLs (phishing indicator)
