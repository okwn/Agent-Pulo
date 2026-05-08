# AGENT_FLOW.md — Agent Flow Architecture

## Pipeline Flow

```
1. RECEIVE NORMALIZED EVENT
   └─ type: NormalizedEvent (from farcaster normalize.ts)
      Types: mention | reply | dm

2. DEDUPLICATION (DedupeGuard)
   ├─ In-memory Set check (in-flight events)
   ├─ Key: mention:{castHash} | reply:{castHash} | dm:{fid}:{timestamp}
   ├─ Duplicate → throw DeduplicationError (caught, logged, ignored)
   └─ First occurrence → mark in-flight, continue

3. IDENTIFY ACTOR USER
   └─ provider.getUserByFid(event.fid) via Far provider

4. LOAD USER PREFERENCES
   ├─ Query user_preferences table by fid
   ├─ Fall back to defaults if not found
   └─ Returns: UserPreferences | null

5. APPLY PLAN LIMITS (PlanGuard)
   ├─ checkEventLimit(fid, plan) → throw if exceeded
   ├─ checkReplyLimit(fid, plan) → returns remaining
   ├─ checkTruthCheckAllowed(plan) → boolean
   └─ checkTrendAllowed(plan) → boolean

6. INTENT CLASSIFICATION (IntentClassifier)
   ├─ Extract text from event
   ├─ Score against 10 intent categories (keyword weights)
   ├─ Longest-keyword-first to avoid partial matches
   ├─ Returns: IntentClassification { category, runType, confidence }
   └─ Free users: premium intents → save_draft

7. BUILD FARCASTER CONTEXT (ContextBuilder)
   ├─ getUserByFid(fid)
   ├─ loadPreferences(fid)
   ├─ getUserRecentCasts(fid, limit=10)
   ├─ getCastThread(hash, depth) if reply/mention with parent
   └─ searchCasts(keyword) for relevant trends

8. SAFETY PRECHECK (SafetyGate.preCheck)
   ├─ RuleBasedSafetyGate in live mode, NoOpSafetyGate in mock
   ├─ Checks: scam URLs, private key requests, wallet drainer refs
   └─ Result: SafetyResult { passed, riskLevel, reason }

9. DECIDE ACTION (DecisionEngine.decide)
   ├─ Inputs: IntentClassification, AgentContext, preSafety, postSafety
   ├─ Safety gates: critical → escalate_to_admin, high → save_draft
   ├─ Plan limits: free + premium_action → save_draft
   └─ Returns: AgentDecision { runType, action, confidence, reasoning }

10. SAFETY POSTCHECK (SafetyGate.postCheck)
    ├─ Before any publish, verify output is safe
    ├─ Critical block: escalate_to_admin (no publish possible)
    └─ Update decision.postSafetyOk = postSafety.passed

11. ROUTE TO SPECIALIZED AGENT (via ActionExecutor)
    ├─ publish_reply → provider.write.publishCast/publishReply
    ├─ save_draft → reply_drafts table
    ├─ create_truth_check → truth_checks table
    ├─ create_trend → trends table
    ├─ send_alert → alert_deliveries + notification
    ├─ escalate_to_admin → reply_drafts (escalation text)
    └─ ignore → no-op

12. PERSIST RUN LOG (AgentRunLogger)
    ├─ Start: insert agent_runs row (status=pending)
    └─ Completion: update status, errorCode, output

13. EMIT OBSERVABLE EVENT
    └─ Logger emits structured log: runId, eventId, intent, action, status, metrics
```

## Decision Matrix

| Intent Category | Safety | Plan | Action |
|---|---|---|---|
| mention_reply | passed | pro/team | publish_reply |
| mention_reply | passed | free | save_draft (approval required) |
| mention_reply | critical risk | any | escalate_to_admin |
| truth_check | passed | pro/team | create_truth_check |
| truth_check | passed | free | save_draft (plan limit) |
| trend_alert | passed | team | create_trend |
| trend_alert | passed | free/pro | save_draft (plan limit) |
| thread_summary | any | any | save_draft |
| admin_action | any | any | escalate_to_admin |
| dm | passed | any | publish_reply |
| other | any | any | ignore |

## Data Flow

```
NormalizedEvent
    │
    ▼
DedupeGuard.check() ──duplicate──→ throw DeduplicationError
    │
    ▼
IntentClassifier.classify()
    │
    ▼
ContextBuilder.build()
    │
    ├──► preSafety: SafetyGate.preCheck()
    │         │
    │         ▼
    │    DecisionEngine.decide()
    │         │
    │         ├──► SafetyGate.postCheck()
    │         │         │
    │         │         ▼
    │         │    ActionExecutor.execute()
    │         │         │
    │         │         ▼
    │         │    AgentRunLogger.logCompletion()
    │         │         │
    │         └─────────┘
    │
    ▼
AgentRunLogger.logStart()
```

## Key Invariants

1. **No publish without post-safety check** — `publishReply` is only called after `postSafetyOk === true`
2. **Every run produces an agent_runs row** — `logStart` called before processing, `logCompletion` after
3. **Decisions are explainable** — `decision.reasoning` field explains why this action was chosen
4. **Write operations are backend-only** — `signerUuid` lives in env, never exposed to frontend
5. **Mock mode never calls external APIs** — all providers return mock data