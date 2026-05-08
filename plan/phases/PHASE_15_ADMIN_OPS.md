# Phase 15: Admin Operations

## Status: ✅ Complete

## Objective
Implement robust admin operations for error tracking, job management, and system health monitoring.

## What Was Built

### 1. Error Package (`packages/errors`)

**Core Types:**
- `ErrorCode` enum - 16 error codes (FARCASTER_*, LLM_*, SAFETY_*, etc.)
- `ErrorCategory` enum - FARCASTER, LLM, SAFETY, PLAN, ALERT, INFRA, UNKNOWN
- `ErrorStatus` enum - pending, retrying, resolved, dead_lettered
- `AppError` class with correlation ID, retry logic, serialization

**Retry Configuration:**
- Per-code retry configs (max attempts, delay, strategy)
- Exponential backoff for FARCASTER errors
- Fixed retry for LLM_INVALID_JSON
- No retry for SAFETY_BLOCKED, PLAN_LIMIT_EXCEEDED, etc.

**Stores:**
- `InMemoryErrorStore` - Error persistence and filtering
- `InMemoryRetryQueue` - Job queue management
- `DeadLetterQueue` - Non-retryable errors

### 2. API Routes (`apps/api/src/routes/admin.ts`)

**Error Routes:**
- `GET /api/admin/errors` - List with filters (code, category, status)
- `GET /api/admin/errors/:id` - Error detail
- `POST /api/admin/errors` - Create test error
- `POST /api/admin/errors/:id/retry` - Retry error (admin only, logged)

**Job Routes:**
- `GET /api/admin/jobs` - List jobs
- `GET /api/admin/jobs/:id` - Job detail
- `POST /api/admin/jobs/:id/retry` - Retry job
- `DELETE /api/admin/jobs/:id` - Cancel job

**Health Routes:**
- `GET /api/admin/health` - System health overview
- `GET /api/admin/stats` - Dashboard statistics

**System Routes:**
- `GET /api/admin/events` - Event log
- `GET /api/admin/safety-flags` - Safety flags
- `POST /api/admin/safety-flags/:id/resolve` - Resolve flag
- `GET /api/admin/truth-checks` - Truth check reviews
- `POST /api/admin/truth-checks/:id/approve` - Approve check
- `GET /api/admin/trends` - Trend approvals
- `POST /api/admin/trends/:id/approve` - Approve trend
- `GET /api/admin/alert-logs` - Alert delivery logs
- `GET /api/admin/debt` - Technical debt board
- `POST /api/admin/debt` - Add debt item

### 3. Web App API Client (`apps/web/src/lib/api.ts`)

Added:
- `getAdminErrors()`, `getAdminError()`, `retryAdminError()`, `createAdminError()`
- `getAdminJobs()`, `getAdminJob()`, `retryAdminJob()`
- `getAdminHealth()`, `getAdminStats()`
- `getAdminEvents()`, `getAdminSafetyFlags()`, `getAdminTruthChecks()`, `getAdminTrends()`, `getAdminAlertLogs()`, `getAdminDebt()`
- All related types

### 4. Admin UI

- `/admin` - Dashboard with quick links (added Errors link)
- `/admin/errors` - Error browser with:
  - Status filters (all, pending, retrying, resolved, dead_lettered)
  - Category badges
  - Retry button with audit logging
  - Create test error button
- `/admin/system` - System health with:
  - Service status cards (API, DB, Redis, Far caster, LLM)
  - Error metrics (total, pending, retrying, dead letters)
  - Job metrics (total, pending, running, failed)

### 5. Tests (29 passing)

Coverage:
- AppError creation and categorization
- Retry logic (canRetry, getRetryDelay, exponential backoff)
- Error store CRUD and filtering
- Retry queue enqueue/dequeue
- Dead letter queue operations
- Error factory and metadata

### 6. Documentation

- `docs/errors/ERROR_TAXONOMY.md` - Error codes, categories, status
- `docs/runbooks/RETRY_AND_DEAD_LETTER_RUNBOOK.md` - Retry flow, DLQ handling
- `docs/observability/CORRELATION_IDS.md` - Trace ID usage
- `plan/phases/PHASE_15_ADMIN_OPS.md` - This file

## Error Codes Implemented

| Code | Category | Retryable |
|------|----------|-----------|
| FARCASTER_WEBHOOK_INVALID | FARCASTER | No |
| FARCASTER_CAST_FETCH_FAILED | FARCASTER | Yes |
| FARCASTER_PUBLISH_FAILED | FARCASTER | Yes |
| FARCASTER_RATE_LIMITED | FARCASTER | Yes |
| LLM_TIMEOUT | LLM | Yes |
| LLM_INVALID_JSON | LLM | No |
| LLM_BUDGET_EXCEEDED | LLM | No |
| SAFETY_BLOCKED | SAFETY | No |
| PLAN_LIMIT_EXCEEDED | PLAN | No |
| DUPLICATE_EVENT | PLAN | No |
| ALERT_CONSENT_MISSING | ALERT | No |
| DIRECT_CAST_FAILED | ALERT | Yes |
| DB_ERROR | INFRA | Yes |
| REDIS_ERROR | INFRA | Yes |
| UNKNOWN_ERROR | UNKNOWN | Yes |

## Admin Actions Logged

- Error retry: `[AUDIT] Admin {fid} retried error {id}`
- Job retry: `[AUDIT] Admin {fid} retried job {id}`
- Safety flag resolve, truth check approve, trend approve

## TODO (Future Phases)

- [ ] Persist errors to database
- [ ] Background worker for retry queue
- [ ] Alerting when DLQ grows
- [ ] Real-time updates via WebSocket
- [ ] Error grouping by root cause
- [ ] Auto-retry with circuit breaker
- [ ] Request ID middleware for HTTP