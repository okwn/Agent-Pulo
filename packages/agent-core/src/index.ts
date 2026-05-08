// @pulo/agent-core — Agent orchestration system

// Re-export NormalizedEvent from farcaster for use in agent-core tests and consumers
export type { NormalizedEvent } from '@pulo/farcaster';

// Types
export type {
  AgentRunType,
  Plan,
  PlanLimits,
  UserPreferences,
  RiskLevel,
  SafetyResult,
  IntentCategory,
  IntentClassification,
  AgentContext,
  ActionDecision,
  AgentDecision,
  ActionStatus,
  ActionResult,
  PipelineMetrics,
  PipelineContext,
} from './types.js';

export { AGENT_RUN_TYPES, PLAN_LIMITS } from './types.js';

// Schemas
export * from './schema/outputs.js';

// Errors
export {
  AgentCoreError,
  DeduplicationError,
  PlanLimitExceededError,
  SafetyBlockError,
  IntentClassificationError,
  ContextBuildingError,
  NoApplicableAgentError,
  ActionExecutionError,
  isAgentCoreError,
} from './errors.js';

// Pipeline components
export { dedupeGuard, DedupeGuard } from './pipeline/dedupe.js';
export { intentClassifier, IntentClassifier } from './pipeline/intent.js';
export { contextBuilder, ContextBuilder } from './pipeline/context.js';
export { planGuard, PlanGuard } from './pipeline/plan.js';
export {
  getSafetyGate,
  setSafetyGate,
  resetSafetyGate,
  NoOpSafetyGate,
  RuleBasedSafetyGate,
  type SafetyGate,
} from './pipeline/safety.js';
export { decisionEngine, DecisionEngine } from './pipeline/decision.js';
export { actionExecutor, ActionExecutor } from './pipeline/executor.js';
export { agentRunLogger, AgentRunLogger, type RunLogParams } from './pipeline/logger.js';
export { publicReplyFormatter, PublicReplyFormatter } from './pipeline/public-reply-formatter.js';
export { dashboardLinkGenerator, DashboardLinkGenerator } from './pipeline/dashboard-links.js';
export { mentionCommandRouter, MentionCommandRouter, type MentionCommand, type MentionCommandResult } from './pipeline/mention-commands.js';

// Orchestrator
export { agentOrchestrator, AgentOrchestrator } from './orchestrator.js';