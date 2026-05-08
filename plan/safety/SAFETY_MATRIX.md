# SAFETY_MATRIX.md — Safety Guard Coverage Matrix

**Status:** Complete

## Guard × Action Matrix

| Guard | reply | mention_analysis | reply_suggestion | radar_alert | direct_cast | auto_publish |
|---|---|---|---|---|---|---|
| PlanLimitsGuard | ✓ | ✓ | ✓ | ✓ | — | — |
| ConsentGuard | — | — | — | — | ✓ | ✓ |
| DuplicateReplyGuard | ✓ | — | — | — | — | — |
| SameAuthorCooldownGuard | ✓ | — | — | — | — | — |
| SameCastCooldownGuard | ✓ | — | — | — | — | — |
| ChannelCooldownGuard | ✓ | — | — | — | — | — |
| PrivateDataGuard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FinancialAdviceGuard | ✓ | — | ✓ | — | ✓ | ✓ |
| LinkRiskGuard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ScamRiskGuard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ToxicityGuard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PoliticalContentGuard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| AutoPublishGate | — | — | — | — | — | ✓ |

## Risk Level Thresholds

| Level | Score Range | Behavior |
|---|---|---|
| `low` | 0 – 0.3 | Allowed |
| `medium` | 0.3 – 0.5 | Flagged, allowed |
| `high` | 0.5 – 0.7 | Flagged, allowed for PRO+ |
| `critical` | ≥ 0.7 | Blocked always |

## Safety Flag Reference

| Flag | Guard | Hard Block? | Log Level |
|---|---|---|---|
| `RATE_LIMIT_EXCEEDED` | RateLimiter | Yes | warn |
| `PLAN_LIMIT_EXCEEDED` | PlanLimitsGuard | Yes | warn |
| `DUPLICATE_REPLY` | DuplicateReplyGuard | Yes | warn |
| `AUTHOR_COOLDOWN` | SameAuthorCooldownGuard | Yes | warn |
| `CAST_COOLDOWN` | SameCastCooldownGuard | Yes | warn |
| `CHANNEL_COOLDOWN` | ChannelCooldownGuard | Yes | warn |
| `CONSENT_REQUIRED` | ConsentGuard | Yes | warn |
| `SCAM_RISK` | ScamRiskGuard | Only if critical | warn |
| `TOXIC_CONTENT` | ToxicityGuard | Yes (future) | warn |
| `FINANCIAL_ADVICE` | FinancialAdviceGuard | Yes | warn |
| `POLITICAL_CONTENT` | PoliticalContentGuard | Yes | warn |
| `PRIVATE_DATA_LEAK` | PrivateDataGuard | Yes | warn |
| `LINK_RISK` | LinkRiskGuard | Yes | warn |
| `AUTO_PUBLISH_BLOCKED` | AutoPublishGate | Yes | warn |
| `UNVERIFIED_CLAIM` | AutoPublishGate | Yes | warn |

## Plan × Feature Matrix

| Feature | free | pro | creator | admin |
|---|---|---|---|---|
| Reply | ✓ | ✓ | ✓ | ✓ |
| Reply + cooldowns | ✓ | ✓ | ✓ | ✓ |
| Mention analysis | 5/day | 100/day | 500/day | ∞ |
| Reply suggestion | 3/day | 50/day | 100/day | ∞ |
| Radar alert | 1/day | 10/day | 30/day | ∞ |
| Direct cast | No | Opt-in | Opt-in | ✓ |
| Mini-app notifications | No | ✓ | ✓ | ✓ |
| Auto-publish | No | No | No | ✓ |
| Full audit logging | No | No | No | ✓ |

## Guard Execution Order

1. `SafetyBlockError` thrown → stop immediately
2. Plan limits checked first (cheapest)
3. Consent checks
4. Spam prevention (cooldowns, dedupe)
5. Content safety (private data first, then financial, then scam)
6. Auto-publish special gate
7. Record usage
8. Return void on success

## Future Guard Ideas

- `ReputationGuard`: Block users below a trust score
- `GeographicGuard`: Regional content restrictions
- `AgeOfAccountGuard`: New accounts get stricter limits
- `EngagementBaitGuard`: Detect engagement bait patterns
- `NFTMintingGuard`: Special handling for NFT minting scams
- `BridgeRiskGuard`: Cross-chain bridge exploits
