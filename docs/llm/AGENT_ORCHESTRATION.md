# AGENT_ORCHESTRATION.md — Agent Orchestration Architecture

## Overview

The PULO agent orchestration system is a deterministic, event-driven pipeline that processes incoming Far events through a structured sequence of steps. No LLM is required for core routing — the system uses rule-based intent classification and a decision engine to determine actions.

```
NormalizedEvent
  → dedupe (DedupeGuard)
  → identify actor + load preferences + plan limits
  → classify intent (IntentClassifier)
  → build context (ContextBuilder)
  → safety precheck (SafetyGate)
  → decide action (DecisionEngine)
  → safety postcheck (SafetyGate)
  → execute action (ActionExecutor)
  → persist run log (AgentRunLogger)
  → emit observable event
```

## Core Components

### `AgentOrchestrator`

The main entry point. `orchestrator.process(event, eventId)` runs the full pipeline.

```typescript
import { agentOrchestrator } from '@pulo/agent-core';

const decision = await agentOrchestrator.process(normalizedEvent, eventId);
```

### `IntentClassifier`

Rule-based keyword classifier. Runs in `O(keywords × text_length)` — no LLM needed.

- Scores text against 10 intent categories using weighted keyword matching
- Returns `IntentClassification` with `category`, `runType`, `confidence`
- Keywords sorted longest-first to avoid partial matches (e.g. `fact check` before `check`)
- DMs are directly routed to `dm` category

### `ContextBuilder`

Loads actor user, preferences, recent casts, and related thread from Far provider + DB.

### `DedupeGuard`

Two-level deduplication:
1. **In-memory** — in-flight Set prevents concurrent duplicate processing
2. **DB** — optional `wasProcessed()` checks the `agent_events.dedupe_key` column

### `PlanGuard`

Enforces per-plan rate limits by querying the DB:

- `checkEventLimit(fid, plan)` — max events per day
- `checkReplyLimit(fid, plan)` — replies per day
- `checkTruthCheckAllowed(plan)` — pro/team only
- `checkTrendAllowed(plan)` — team only

### `SafetyGate`

Two-point safety checks — `preCheck` before routing, `postCheck` before publishing:

- `NoOpSafetyGate` — mock mode, always passes
- `RuleBasedSafetyGate` — production, checks for scam URLs, private key requests, wallet drainer references

Critical blocks (`riskLevel === 'critical'`) escalate to admin. High risk saves as draft.

### `DecisionEngine`

Takes `IntentClassification` + `AgentContext` + safety results → `AgentDecision`.

Decision rules:
- Critical safety → `escalate_to_admin`
- High safety risk → `save_draft`
- Plan-limit-exceeded → `save_draft` (premium actions for free users)
- Pro/team truth_check → `create_truth_check`
- Team trend_analysis → `create_trend`
- All others → `publish_reply` (pro/team) or `save_draft` (free)

### `ActionExecutor`

Executes the decided action, persists to DB, returns `ActionResult`.

| Action | DB Write |
|---|---|
| `publish_reply` | `publishCast` / `publishReply` via provider |
| `save_draft` | `reply_drafts` row |
| `create_truth_check` | `truth_checks` row |
| `create_trend` | `trends` row |
| `send_alert` | `alert_deliveries` row + notification |
| `escalate_to_admin` | `reply_drafts` row (escalation text) |
| `ignore` | no DB write |

### `AgentRunLogger`

Persists every run to `agent_runs` table:
- On start: insert with `status='pending'`
- On completion: update with `status='completed'|'failed'`, `errorCode`, `output`

## Safety Gates

Safety checks are enforced at two points:

**Pre-check** (before routing): `SafetyGate.preCheck(event, text)`
- Blocks dangerous content before even determining intent
- Critical = escalate_to_admin, High = save_draft

**Post-check** (before publishing): `SafetyGate.postCheck(output, context)`
- Verifies output doesn't contain sensitive data (private keys, etc.)
- Critical block prevents any publish — must escalate
- High risk saves draft for manual approval

**No direct publishing** — all publish actions go through `publishReply` / `publishCast` which require `signerUuid` and always pass through post-safety check.

## Plan Limits

| Action | Free | Pro | Team |
|---|---|---|---|
| mention_reply | draft | publish | publish |
| truth_check | draft | publish | publish |
| trend_analysis | block | block | publish |
| send_alert | draft | publish | publish |

## Run Types

- `mention_reply` — Reply to a mention
- `cast_summary` — Summarize a cast
- `thread_summary` — Summarize a thread
- `reply_suggestion` — Suggest a reply
- `cast_rewrite` — Rewrite a cast
- `truth_check` — Create a truth check
- `trend_analysis` — Detect and create a trend
- `risk_analysis` — Analyze risk (planned)
- `alert_generation` — Generate an alert (planned)
- `admin_assist` — Admin assistance

## Mock Mode

All pipeline components work without external APIs in mock mode:
- `IntentClassifier` uses keyword patterns (no LLM)
- `ContextBuilder` uses mock Far provider
- `DecisionEngine` uses rule-based logic (no LLM)
- `ActionExecutor` saves drafts to DB but doesn't publish

Set `PULO_FARCASTER_MODE=mock` (default) to enable.