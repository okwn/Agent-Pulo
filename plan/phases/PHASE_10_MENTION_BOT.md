# Phase 10 — PULO Mention Bot

## Status: ✅ Complete

## Deliverables

### Package Components

- [x] `MentionCommandRouter` — pattern-based command detection for 16 commands
- [x] `PublicReplyFormatter` — formats agent decisions into ≤320 char public replies
- [x] `DashboardLinkGenerator` — generates dashboard report links
- [x] `PublicReplyFormatter.formatSafetyWarning()` — airdrop/token safety warnings
- [x] `PublicReplyFormatter.formatLimitExceeded()` — free tier CTA

### Worker

- [x] `mention-job.ts` — BullMQ job `pulo-mentions` with 3-retry exponential backoff
- [x] `enqueueMention()` — enqueues webhook payload
- [x] `startMentionWorker()` — processes mention jobs
- [x] `checkMentionIdempotency()` — skips duplicate events
- [x] `publishMentionReply()` — idempotent reply publish
- [x] `saveReplyDraft()` — saves failed publish as draft
- [x] `logMentionDelivery()` — records every attempt
- [x] Worker initialized in `apps/worker/src/index.ts`

### API Routes

- [x] `GET /api/admin/agent-events` — list events with filters
- [x] `GET /api/admin/agent-runs` — list pipeline runs
- [x] `GET /api/admin/reply-drafts` — list pending drafts
- [x] `POST /api/admin/reply-drafts/:id/publish` — publish draft
- [x] `POST /api/admin/agent-events/:id/retry` — retry failed event

### UI Pages

- [x] `/admin/events` — event log with retry action
- [x] `/admin/runs` — pipeline run list with view links
- [x] `/admin/drafts` — pending drafts with publish button

### Documentation

- [x] `docs/architecture/MENTION_BOT_FLOW.md`
- [x] `docs/api/MENTION_WEBHOOK_API.md`
- [x] `docs/errors/MENTION_BOT_ERRORS.md`
- [x] `plan/phases/PHASE_10_MENTION_BOT.md`

## Supported Commands (16)

| Command | Intent |
|---------|--------|
| `@pulo summarize` | thread_summary |
| `@pulo explain this` | cast_summary |
| `@pulo is this true?` | truth_check |
| `@pulo bu doğru mu?` | truth_check (TR) |
| `@pulo scam mı?` | risk_analysis |
| `@pulo source?` | cast_summary |
| `@pulo give me a smart reply` | reply_suggestion |
| `@pulo give me a banger reply` | reply_suggestion |
| `@pulo make this clearer` | cast_rewrite |
| `@pulo turn this into a thread` | thread_summary |
| `@pulo rate this cast` | cast_summary |
| `@pulo alpha?` | cast_summary |
| `@pulo what should I reply?` | reply_suggestion |
| `@pulo translate to Turkish` | cast_rewrite |
| `@pulo translate to English` | cast_rewrite |

## Anti-Spam Rules

- Duplicate events blocked via idempotency key `mention:{eventHash}`
- Free tier: short answers + CTA (never long analysis)
- Pro+: richer analysis + dashboard link
- Truth checks: never overstate confidence on unverified claims
- Safety warnings: airdrop/token claims always get verify-source disclaimer
- Max 320 chars per public reply

## TypeScript

- All packages and apps pass `pnpm -r typecheck`
