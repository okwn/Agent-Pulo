# DM and Notification Policy

## Core Principles

1. **Permission-first**: Every push notification channel requires explicit user consent.
2. **Anti-spam by default**: Daily limits, frequency caps, and topic filters prevent abuse.
3. **Never free-ride**: Direct Cast is never enabled by default and never available on free plans.
4. **Audit everything**: Every delivery attempt is logged to `alertDeliveries`.
5. **Idempotent by design**: The same alert cannot be sent to the same user twice.

## Channel Policy

### Inbox
- Always available — no consent required
- Persisted to `alerts` table
- User can mark as read via `/api/alerts/:id/read`

### Mini App Notification
- Requires `allowMiniAppNotifications = true` in user preferences
- Sent via `IFarcasterProvider.notifications.sendMiniAppNotification()`
- If provider is in mock mode, this is a no-op

### Direct Cast / DM
- Requires `allowDirectCasts = true` in user preferences
- Requires paid plan (Pro / Team / Enterprise) — free users are **always blocked**
- Sent via `IFarcasterProvider.notifications.sendDirectCast()`
- If provider is in mock mode, this is a no-op

## Anti-Spam Controls

| Control | Field | Default | Range |
|---------|-------|---------|-------|
| Daily alert limit | `dailyAlertLimit` | 50 | 1–200 |
| Frequency cap | `notificationFrequency` | realtime | realtime/digest/minimal |
| Topic filter | `allowedTopics` | all (empty = all) | list of topic strings |
| Block list | `blockedTopics` | none | list of topic strings |
| Risk tolerance | `riskTolerance` | medium | low/medium/high |

## Scam Warning Policy

Scam warnings (`scam_warning`) are **opt-in only**. Users must explicitly add `'scam_warning'` to `allowedTopics` to receive these alerts. This prevents mass notifications for security events unless the user has requested them.

## Plan-Based Access Control

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Inbox | ✅ | ✅ | ✅ | ✅ |
| Mini App | ✅ (opt-in) | ✅ (opt-in) | ✅ (opt-in) | ✅ (opt-in) |
| Direct Cast | ❌ | ✅ (opt-in) | ✅ (opt-in) | ✅ (opt-in) |
| Daily limit | 50 | 100 | 200 | Custom |
| Frequency modes | realtime | all | all | all |

## Idempotency Keys

Format: `alert:{alertId}:{userId}`

Stored in `alertDeliveries.idempotencyKey` column with unique index. Before sending any alert, the system checks this key to prevent duplicate sends.

## Logging

All delivery attempts are logged to `alertDeliveries` with:
- `alertId`, `userId`, `channel`
- `status` (pending/sent/failed)
- `idempotencyKey`
- `sentAt`, `openedAt`, `errorCode`

No PII beyond `userId` and alert content is stored in delivery logs.
