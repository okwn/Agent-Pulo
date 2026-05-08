# AGENT_PIPELINE.md — AI Agent Pipeline Map

**Date:** 2026-05-08
**Status:** Implemented (Phase 4 complete)

## Pipeline Stages

```
[NormalizedEvent]
      │
      ▼
┌─────────────────────────────────────┐
│ STAGE 1: Dedup                       │
│ DedupeGuard.check()                  │
│ - In-memory Set (in-flight)          │
│ - DB check (wasProcessed)            │
│ Key: mention:{hash} | dm:{fid}:{ts}  │
└─────────────────────────────────────┘
      │ duplicate?
      ▼
┌─────────────────────────────────────┐
│ STAGE 2: Identify Actor             │
│ - resolveUser(fid) via provider      │
│ - loadPreferences(fid) from DB       │
│ - PlanGuard.checkEventLimit()       │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ STAGE 3: Classify Intent            │
│ IntentClassifier.classify()          │
│ - Keyword scoring (10 categories)    │
│ - Longest-match-first               │
│ - Returns: category + runType       │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ STAGE 4: Build Context              │
│ ContextBuilder.build()               │
│ - Recent casts (getUserRecentCasts) │
│ - Thread (getCastThread)            │
│ - Trends (searchCasts)              │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ STAGE 5: Safety PreCheck            │
│ SafetyGate.preCheck()                │
│ - Scam URL detection                │
│ - Private key / wallet drainer      │
│ - Result: { passed, riskLevel }    │
└─────────────────────────────────────┘
      │ critical/high?
      ▼
┌─────────────────────────────────────┐
│ STAGE 6: Decision Engine            │
│ DecisionEngine.decide()              │
│ - Routes by intent + safety + plan   │
│ - Returns: AgentDecision            │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ STAGE 7: Safety PostCheck           │
│ SafetyGate.postCheck()               │
│ - Verifies output doesn't leak      │
│ - Must pass before any publish      │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ STAGE 8: Action Executor             │
│ ActionExecutor.execute()             │
│ - publish_reply → Far provider      │
│ - save_draft → reply_drafts table   │
│ - create_truth_check → DB          │
│ - create_trend → trends table       │
│ - send_alert → alert_deliveries     │
│ - escalate → reply_drafts           │
│ - ignore → no-op                    │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ STAGE 9: Persist Run Log             │
│ AgentRunLogger.logStart()            │
│ → AgentRunLogger.logCompletion()     │
│ - agent_runs table                  │
│ - status, errorCode, output         │
└─────────────────────────────────────┘
```

## Agent Run Types → Actions

| Run Type | Primary Action | Fallback |
|---|---|---|
| mention_reply | publish_reply | save_draft (free/premium) |
| cast_summary | save_draft | — |
| thread_summary | save_draft | — |
| reply_suggestion | save_draft | — |
| cast_rewrite | save_draft | — |
| truth_check | create_truth_check | save_draft (free) |
| trend_analysis | create_trend | save_draft (non-team) |
| risk_analysis | save_draft | — |
| alert_generation | send_alert | save_draft (free) |
| admin_assist | escalate_to_admin | — |

## Safety Gate Rules

### preCheck
- `critical` → `escalate_to_admin` (block routing)
- `high` → `escalate_to_admin` (medium priority)
- `medium/low` → continue

### postCheck
- `critical` → `escalate_to_admin` (no publish possible)
- `high` → `save_draft` (requires approval)
- `medium/low` → proceed with action

## Plan Enforcement

```
Free user:
  mention_reply → save_draft (requiresApproval=true)
  truth_check → save_draft (plan limit)
  trend_analysis → block
  send_alert → save_draft

Pro user:
  mention_reply → publish_reply
  truth_check → create_truth_check
  trend_analysis → block
  send_alert → send_alert

Team user:
  mention_reply → publish_reply
  truth_check → create_truth_check
  trend_analysis → create_trend
  send_alert → send_alert
```

## Schema Alignment

| Action | Table | Key Fields |
|---|---|---|
| publish_reply | — | (via farcaster provider write) |
| save_draft | reply_drafts | castHash, text, status=pending |
| create_truth_check | truth_checks | claimText, status=pending |
| create_trend | trends | title, category, status=active |
| send_alert | alert_deliveries | channel=dm, status=pending |
| escalate_to_admin | reply_drafts | text="ESCALATION [...]", status=pending |
| ignore | — | no DB write |

## Metrics Captured

Each pipeline run captures:
- `deduplicated`: boolean
- `intentClassificationMs`: number
- `contextBuildingMs`: number
- `safetyPreCheckMs`: number
- `safetyPostCheckMs`: number
- `decisionMs`: number
- `actionMs`: number
- `totalMs`: number

All emitted via Pino logger as structured event: `agent_run_complete`.