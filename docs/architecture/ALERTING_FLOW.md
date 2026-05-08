# Alerting Flow — Permission-based Notification Architecture

## Overview

PULO alerting is permission-based and anti-spam. Every alert is saved to the user's inbox before any push channel is attempted. Push channels (Mini App, Direct Cast) require explicit user consent and plan eligibility.

## Delivery Channels

| Channel | Consent Required | Plan Required | Always Available |
|---------|-----------------|---------------|------------------|
| Inbox | No | Any | ✅ |
| Mini App | `allowMiniAppNotifications = true` | Any | ❌ |
| Direct Cast | `allowDirectCasts = true` | Pro/Team/Enterprise | ❌ |

## Rules

1. Every alert is saved to the PULO inbox (database `alerts` table).
2. Mini App notification requires `allowMiniAppNotifications = true`.
3. Direct Cast requires `allowDirectCasts = true` AND a paid plan (not free).
4. Direct Cast is **never enabled by default** and **never available for FREE users**.
5. Alert frequency respects `notificationFrequency` preference and `dailyAlertLimit`.
6. High-risk scam warnings are only sent if user opted into `scam_warning` in `allowedTopics`.
7. Duplicate delivery is prevented via idempotency key `alert:{alertId}:{userId}`.
8. Every delivery attempt is logged to `alertDeliveries` table.

## Components

| Component | Responsibility |
|-----------|---------------|
| `AlertMatcher` | Determines if user should receive an alert based on preferences |
| `UserPreferenceMatcher` | Resolves allowed delivery channels from user preferences |
| `AlertThrottle` | Enforces daily limits and frequency preferences |
| `DeliveryPlanner` | Orchestrates planning and execution across all channels |
| `InboxDeliveryProvider` | Saves alert to DB inbox |
| `MiniAppNotificationProvider` | Pushes via IFarcasterProvider notifications interface |
| `DirectCastProvider` | Sends DM via IFarcasterProvider write interface |
| `AlertTemplateRenderer` | Renders alert body from template with context variables |
| `AlertDeliveryLogger` | Logs every delivery attempt to `alertDeliveries` |

## Flow

```
Alert created (radar approval or truth check completion)
    ↓
AlertMatcher.match() — filter by topic/risk/frequency
    ↓ (allowed)
AlertThrottle.check() — daily limit + frequency mode
    ↓ (allowed)
checkIdempotency(alertId, userId) — no duplicate sends
    ↓ (not found)
UserPreferenceMatcher.allowedChannels() — inbox + miniapp + direct_cast
    ↓
DeliveryPlanner.buildPlan() per channel
    ├── inbox → InboxDeliveryProvider.send()
    ├── miniapp → MiniAppNotificationProvider.send() (if allowed)
    └── direct_cast → DirectCastProvider.send() (if tier ≠ free AND allowDirectCasts)
    ↓
AlertDeliveryLogger.log() — record every attempt
```

## Idempotency

Every delivery plan includes idempotency key `alert:{alertId}:{userId}`. The `alertDeliveries` table is checked before sending. If a record exists, the delivery is skipped.

## Daily Limit

`dailyAlertLimit` (default 50) tracks how many alerts a user can receive per day. `AlertThrottle` resets the window at midnight local time.

## Frequency Modes

| Mode | Behavior |
|------|----------|
| `realtime` | All alerts allowed |
| `digest` | Batched hourly (all alerts allowed, just delayed) |
| `minimal` | Only `weekly_digest` and `admin_message` allowed |

## Anti-Spam Rules Summary

- Block if topic not in `allowedTopics` (or `*`)
- Block if topic in `blockedTopics`
- Block if risk level exceeds user's `riskTolerance`
- Block if `notificationFrequency = minimal` and alert type ≠ weekly/admin
- Block if `dailyAlertLimit` reached
- Block duplicate via idempotency key
- Direct Cast blocked for free tier even if `allowDirectCasts = true`
