// agent-core/errors.ts — Agent core error types

export class AgentCoreError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = 'AgentCoreError';
    this.code = code;
    this.retryable = retryable;
  }
}

export class DeduplicationError extends AgentCoreError {
  readonly duplicateEventId: string;
  constructor(eventId: string) {
    super('DUPLICATE_EVENT', `Event already processed: ${eventId}`, false);
    this.name = 'DeduplicationError';
    this.duplicateEventId = eventId;
  }
}

export class PlanLimitExceededError extends AgentCoreError {
  readonly plan: string;
  readonly limit: string;
  constructor(plan: string, limit: string) {
    super('PLAN_LIMIT_EXCEEDED', `${plan} plan limit exceeded: ${limit}`, false);
    this.name = 'PlanLimitExceededError';
    this.plan = plan;
    this.limit = limit;
  }
}

export class SafetyBlockError extends AgentCoreError {
  readonly riskLevel: string;
  constructor(riskLevel: string, reason: string) {
    super('SAFETY_BLOCK', `Safety block at ${riskLevel}: ${reason}`, false);
    this.name = 'SafetyBlockError';
    this.riskLevel = riskLevel;
  }
}

export class IntentClassificationError extends AgentCoreError {
  constructor(reason: string) {
    super('INTENT_CLASSIFICATION_FAILED', `Intent classification failed: ${reason}`, true);
    this.name = 'IntentClassificationError';
  }
}

export class ContextBuildingError extends AgentCoreError {
  constructor(reason: string) {
    super('CONTEXT_BUILDING_FAILED', `Context building failed: ${reason}`, true);
    this.name = 'ContextBuildingError';
  }
}

export class NoApplicableAgentError extends AgentCoreError {
  readonly intentCategory: string;
  constructor(intentCategory: string) {
    super('NO_APPLICABLE_AGENT', `No agent available for intent: ${intentCategory}`, false);
    this.name = 'NoApplicableAgentError';
    this.intentCategory = intentCategory;
  }
}

export class ActionExecutionError extends AgentCoreError {
  readonly actionType: string;
  constructor(actionType: string, reason: string) {
    super('ACTION_EXECUTION_FAILED', `Action ${actionType} failed: ${reason}`, true);
    this.name = 'ActionExecutionError';
    this.actionType = actionType;
  }
}

export function isAgentCoreError(err: unknown): err is AgentCoreError {
  return err instanceof AgentCoreError;
}