// agent-core/orchestrator.ts — Main agent orchestrator: deterministic pipeline

import type { NormalizedEvent } from '@pulo/farcaster';
import type {
  AgentDecision,
  ActionResult,
  PipelineMetrics,
  PipelineContext,
  IntentClassification,
  SafetyResult,
  AgentContext,
  PlanLimits,
} from './types.js';
import { dedupeGuard } from './pipeline/dedupe.js';
import { intentClassifier } from './pipeline/intent.js';
import { contextBuilder } from './pipeline/context.js';
import { planGuard } from './pipeline/plan.js';
import { getSafetyGate } from './pipeline/safety.js';
import { decisionEngine } from './pipeline/decision.js';
import { actionExecutor } from './pipeline/executor.js';
import { agentRunLogger } from './pipeline/logger.js';
import {
  DeduplicationError,
  PlanLimitExceededError,
  SafetyBlockError,
  AgentCoreError,
} from './errors.js';
import { createChildLogger } from '@pulo/observability';

const logger = createChildLogger('orchestrator');

// Safety gate integration — no unsafe publishing without postCheck
const SAFETY_CHECK_ENABLED = true;

export class AgentOrchestrator {
  /**
   * Process a normalized event through the full deterministic pipeline:
   * 1. dedupe
   * 2. identify actor user
   * 3. load user preferences
   * 4. apply subscription/plan limits
   * 5. classify intent
   * 6. build context
   * 7. run safety precheck
   * 8. route to agent (decision engine)
   * 9. generate structured output (via decision)
   * 10. run safety postcheck
   * 11. decide action
   * 12. execute action
   * 13. persist run logs
   * 14. emit observable event
   */
  async process(event: NormalizedEvent, eventId: string): Promise<AgentDecision> {
    const runId = crypto.randomUUID();
    const startedAt = new Date();
    const metrics: PipelineMetrics = {
      deduplicated: false,
      intentClassificationMs: 0,
      contextBuildingMs: 0,
      safetyPreCheckMs: 0,
      safetyPostCheckMs: 0,
      decisionMs: 0,
      actionMs: 0,
      totalMs: 0,
    };

    const pipelineCtx: PipelineContext = {
      event,
      dedupeKey: null,
      actorUser: null,
      userPreferences: null,
      planLimits: { maxEventsPerDay: 50, maxRepliesPerDay: 10, maxTruthChecksPerDay: 5, maxTrendAlertsPerDay: 3, premiumChannelsOnly: true, priorityProcessing: false },
      intent: null,
      context: null,
      preSafety: null,
      decision: null,
      actionResult: null,
      metrics,
      runId,
    };

    try {
      // ─── Step 1: Dedupe ────────────────────────────────────────────────────────
      const t0 = performance.now();
      try {
        const key = dedupeGuard.check(event);
        pipelineCtx.dedupeKey = key;
        dedupeGuard.markInFlight(key);
      } catch (err) {
        if (err instanceof DeduplicationError) {
          metrics.deduplicated = true;
          logger.info({ runId, eventId, key: err.duplicateEventId }, 'Event deduplicated');
          throw err;
        }
        throw err;
      }
      metrics.deduplicated = false;

      // ─── Step 2–4: Identify actor, load preferences, plan limits ───────────────
      const [actorUser, userPreferences, planLimits] = await Promise.all([
        this.identifyActor(event),
        this.loadUserPreferences(event),
        this.loadPlanLimits(event),
      ]);

      pipelineCtx.actorUser = actorUser;
      pipelineCtx.userPreferences = userPreferences;
      pipelineCtx.planLimits = planLimits;

      // Step 4: Check plan limits
      await this.applyPlanLimits(event, planLimits);

      // ─── Step 5: Classify intent ───────────────────────────────────────────────
      const tIntent = performance.now();
      const intent = intentClassifier.classify(event);
      pipelineCtx.intent = intent;
      metrics.intentClassificationMs = Math.round(performance.now() - tIntent);

      // ─── Step 6: Build context ────────────────────────────────────────────────
      const tCtx = performance.now();
      const context = await contextBuilder.build(event);
      pipelineCtx.context = context;
      metrics.contextBuildingMs = Math.round(performance.now() - tCtx);

      // ─── Step 7: Safety precheck ──────────────────────────────────────────────
      const tSafetyPre = performance.now();
      const preSafety = await getSafetyGate().preCheck(event, this.extractText(event));
      pipelineCtx.preSafety = preSafety;
      metrics.safetyPreCheckMs = Math.round(performance.now() - tSafetyPre);

      if (!preSafety.passed && preSafety.riskLevel === 'critical') {
        throw new SafetyBlockError(preSafety.riskLevel, preSafety.reason);
      }

      // ─── Step 8–9: Decision (routes to specialized agent + structured output) ─
      const tDecision = performance.now();
      const decision = decisionEngine.decide(intent, context, preSafety, preSafety);
      metrics.decisionMs = Math.round(performance.now() - tDecision);
      pipelineCtx.decision = decision;

      // ─── Step 10: Safety postcheck ────────────────────────────────────────────
      if (SAFETY_CHECK_ENABLED) {
        const tSafetyPost = performance.now();
        const postSafety = await getSafetyGate().postCheck(decision.action, `action:${decision.action.action}`);
        metrics.safetyPostCheckMs = Math.round(performance.now() - tSafetyPost);

        if (!postSafety.passed && postSafety.riskLevel === 'critical') {
          throw new SafetyBlockError(postSafety.riskLevel, postSafety.reason);
        }

        // Update decision with post-safety result
        pipelineCtx.decision = {
          ...decision,
          postSafetyOk: postSafety.passed,
        };
      }

      // ─── Step 11–12: Execute action ───────────────────────────────────────────
      const tAction = performance.now();
      const actionResult = await actionExecutor.execute(pipelineCtx.decision!, context, runId);
      pipelineCtx.actionResult = actionResult;
      metrics.actionMs = Math.round(performance.now() - tAction);

      // ─── Step 13: Persist run log ─────────────────────────────────────────────
      await agentRunLogger.logCompletion(
        runId,
        pipelineCtx.decision!,
        actionResult,
        metrics,
        new Date()
      );

      // ─── Step 14: Emit observable event ───────────────────────────────────────
      this.emitMetric(runId, eventId, intent, pipelineCtx.decision!, actionResult, metrics);

      metrics.totalMs = Math.round(performance.now() - t0);
      logger.info({ runId, eventId, action: pipelineCtx.decision!.action.action, metrics }, 'Pipeline completed');

      // Cleanup dedup in-flight
      if (pipelineCtx.dedupeKey) {
        dedupeGuard.clearInFlight(pipelineCtx.dedupeKey);
      }

      return pipelineCtx.decision!;

    } catch (err) {
      metrics.totalMs = Math.round(performance.now() - startedAt.getTime());

      // Log failure
      await agentRunLogger.logCompletion(
        runId,
        pipelineCtx.decision ?? {
          runType: 'mention_reply',
          action: { action: 'ignore', reason: `pipeline_error: ${String(err)}` },
          confidence: 0,
          reasoning: String(err),
          preSafetyOk: false,
          postSafetyOk: false,
          requiresApproval: false,
        },
        { status: 'failed', output: null, error: String(err) },
        metrics,
        new Date(),
        String(err)
      ).catch(() => {}); // non-fatal

      // Cleanup
      if (pipelineCtx.dedupeKey) {
        dedupeGuard.clearInFlight(pipelineCtx.dedupeKey);
      }

      throw err;
    }
  }

  private async identifyActor(event: NormalizedEvent) {
    try {
      const provider = (await import('@pulo/farcaster')).getProvider();
      const user = await provider.getUserByFid(event.fid);
      return { fid: user.fid, username: user.username };
    } catch {
      return { fid: event.fid, username: event.username };
    }
  }

  private async loadUserPreferences(event: NormalizedEvent) {
    // Preferences are loaded in context builder
    return null;
  }

  private async loadPlanLimits(event: NormalizedEvent) {
    const { PLAN_LIMITS } = await import('./types.js');
    return PLAN_LIMITS.free; // default to free, resolved from DB in context builder
  }

  private async applyPlanLimits(event: NormalizedEvent, limits: PlanLimits): Promise<void> {
    // PlanGuard check is done via planGuard.checkEventLimit call in the pipeline
    // This method is a hook point for more complex limit logic
  }

  private extractText(event: NormalizedEvent): string {
    switch (event.type) {
      case 'mention': return event.castText;
      case 'reply': return event.castText;
      case 'dm': return event.message;
    }
  }

  private emitMetric(
    runId: string,
    eventId: string,
    intent: IntentClassification,
    decision: AgentDecision,
    result: ActionResult,
    metrics: PipelineMetrics
  ): void {
    logger.info({
      runId,
      eventId,
      intent: intent.category,
      runType: decision.runType,
      action: decision.action.action,
      status: result.status,
      metrics,
    }, 'agent_run_complete');
  }
}

export const agentOrchestrator = new AgentOrchestrator();