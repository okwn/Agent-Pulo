# PHASE_04_AGENT_CORE.md — Agent Orchestration Pipeline

**Status:** Completed 2026-05-08
**Deliverables:** 11 source files, 4 docs, 12 passing tests

## What Was Built

### Source Files (packages/agent-core/src/)

| File | Purpose |
|---|---|
| `types.ts` | All core types — AgentRunType (10 types), Plan/PlanLimits, UserPreferences, SafetyResult, IntentClassification, AgentContext, AgentDecision, ActionResult, PipelineMetrics |
| `errors.ts` | AgentCoreError hierarchy — DeduplicationError, PlanLimitExceededError, SafetyBlockError, IntentClassificationError, ContextBuildingError, NoApplicableAgentError, ActionExecutionError |
| `schema/outputs.ts` | All Zod schemas — IntentClassificationSchema, AgentDecisionSchema, ReplyOutputSchema, TruthCheckOutputSchema, TrendOutputSchema, AlertOutputSchema, SafetyAssessmentSchema, AgentRunLogSchema |
| `pipeline/dedupe.ts` | DedupeGuard — in-memory Set + DB dedupe key check |
| `pipeline/intent.ts` | IntentClassifier — keyword scoring, 10 categories, longest-match-first |
| `pipeline/context.ts` | ContextBuilder — loads user, preferences, casts, thread, trends |
| `pipeline/plan.ts` | PlanGuard — enforces per-plan rate limits and action permissions |
| `pipeline/safety.ts` | SafetyGate interface + NoOpSafetyGate + RuleBasedSafetyGate |
| `pipeline/decision.ts` | DecisionEngine — routes by intent + safety + plan, produces AgentDecision |
| `pipeline/executor.ts` | ActionExecutor — executes publish/draft/truth_check/trend/alert/escalate |
| `pipeline/logger.ts` | AgentRunLogger — persists every run to agent_runs |
| `orchestrator.ts` | AgentOrchestrator — full 14-step deterministic pipeline |
| `index.ts` | Public API — exports all types, schemas, errors, components |
| `index.test.ts` | 12 tests — intent classification, decision engine, dedupe guard |

### Documentation

| File | Content |
|---|---|
| `docs/llm/AGENT_ORCHESTRATION.md` | Full orchestration docs, component descriptions, safety gates, plan limits, run types |
| `docs/architecture/AGENT_FLOW.md` | Flow diagram, decision matrix, data flow diagram, key invariants |
| `plan/ai-agent-map/AGENT_PIPELINE.md` | Pipeline stage map, action table, plan enforcement, metrics |

## Design Decisions

1. **No LLM required for core routing** — IntentClassifier uses keyword scoring; DecisionEngine uses rule-based logic. LLM only needed for content generation (future).
2. **Safety gates at two points** — preCheck before routing, postCheck before publishing. Critical blocks prevent routing/publishing entirely.
3. **Plan limits enforced at decision stage** — free users get drafts for premium actions, never direct publish.
4. **Mock mode fully functional** — all components work without external APIs via MockFarcasterProvider.
5. **Every run produces agent_runs row** — logStart before processing, logCompletion after.

## 10 Agent Run Types

1. `mention_reply` — Reply to a mention (default)
2. `cast_summary` — Summarize a single cast
3. `thread_summary` — Summarize a thread (depth=2)
4. `reply_suggestion` — Suggest a reply to a cast
5. `cast_rewrite` — Rewrite/improve a cast
6. `truth_check` — Create a truth check record (pro/team)
7. `trend_analysis` — Detect and create a trend (team only)
8. `risk_analysis` — Analyze risk of content (planned)
9. `alert_generation` — Generate and send an alert (planned)
10. `admin_assist` — Admin assistance (escalate)

## Acceptance Criteria (Phase 4)

- [x] 10 agent run types defined in AgentRunType
- [x] 14-step deterministic orchestration pipeline
- [x] AgentOrchestrator with full pipeline
- [x] IntentClassifier (rule-based, no LLM)
- [x] ContextBuilder (loads user, casts, thread, trends)
- [x] DecisionEngine (routes by intent + safety + plan)
- [x] ActionExecutor (7 action types, persists to DB)
- [x] AgentRunLogger (persists every run to agent_runs)
- [x] DedupeGuard (in-memory + DB)
- [x] PlanGuard (per-plan rate limits)
- [x] SafetyGate interface + NoOp + RuleBased implementations
- [x] All Zod output schemas
- [x] docs/llm/AGENT_ORCHESTRATION.md
- [x] docs/architecture/AGENT_FLOW.md
- [x] plan/ai-agent-map/AGENT_PIPELINE.md
- [x] Tests: mention event → intent classification → decision
- [x] Tests: duplicate event ignored (DeduplicationError thrown)
- [x] Tests: free user premium request returns CTA/draft
- [x] Tests: risky content escalates or refuses
- [x] Tests: mock action executor records output
- [x] Agent core works without external LLM (rule-based throughout)
- [x] Every run produces agent_runs row
- [x] Decisions are explainable (reasoning field)
- [x] No direct publishing before safety postcheck

## Dependencies

- `@pulo/farcaster` — NormalizedEvent, getProvider
- `@pulo/db` — schema, getDB
- `@pulo/observability` — Pino logger
- `drizzle-orm` — DB access
- `zod` — Output schemas

## Next Phase

**Phase 5:** Worker/job system — BullMQ setup, job queue schema, worker process, job handlers for each agent run type.