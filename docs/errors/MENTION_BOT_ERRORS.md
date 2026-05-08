# Mention Bot Errors

## Error Codes

All mention bot errors are prefixed with `MENTION_`.

| Code | Description | Severity | Retryable |
|------|-------------|----------|-----------|
| `MENTION_WEBHOOK_VERIFICATION_FAILED` | Invalid Neynar signature | warn | No |
| `MENTION_NO_EVENTS` | Webhook body contained no mention events | warn | No |
| `MENTION_QUEUE_FULL` | BullMQ queue rejected job | error | Yes |
| `MENTION_PROCESSING_FAILED` | Orchestrator pipeline threw | error | Yes |
| `MENTION_DUPLICATE_EVENT` | Same event hash already processed | debug | No |
| `MENTION_PUBLISH_FAILED` | Reply publish to farcaster failed | error | Yes |
| `MENTION_DRAFT_SAVE_FAILED` | Could not save reply draft | error | No |
| `MENTION_UNAUTHORIZED_FID` | FID not recognized in DB | warn | No |
| `MENTION_SAFETY_BLOCKED` | Safety gate blocked the action | warn | No |
| `MENTION_PLAN_LIMIT_EXCEEDED` | Free/pro tier limit hit | warn | No |
| `MENTION_INTENT_UNCLEAR` | No command pattern matched | debug | No |
| `MENTION_IDEMPOTENCY_CONFLICT` | Idempotency key already exists | debug | No |

## Idempotency Keys

| Key Pattern | Purpose |
|------------|---------|
| `mention:{eventHash}` | Prevent duplicate event processing |
| `reply:{runId}` | Prevent duplicate reply publish |
| `draft:{eventHash}` | Prevent duplicate draft creation |
| `delivery:{runId}` | Prevent duplicate delivery logging |

## Retry Policy

- Job retries: 3 attempts, exponential backoff (5s, 10s, 20s)
- After 3 failures: job marked failed, visible in `/admin/events`
- Admin can manually retry via `/api/admin/agent-events/:id/retry`

## Admin Visibility

- All failed jobs visible at `/admin/events`
- Failed runs can be retried from the admin UI
- Reply drafts at `/admin/drafts` can be manually published
