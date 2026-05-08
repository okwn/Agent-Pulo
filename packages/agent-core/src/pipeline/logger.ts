// pipeline/logger.ts — Agent run logger — persists every run to agent_runs table

import type { AgentDecision, ActionResult, PipelineMetrics, AgentRunType } from '../types.js';
import { getDB, schema } from '@pulo/db';
import { sql } from 'drizzle-orm';

const { agentRuns } = schema;

export interface RunLogParams {
  runId: string;
  eventId: string;
  runType: AgentRunType;
  fid: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  decision?: AgentDecision;
  actionResult?: ActionResult;
  metrics?: PipelineMetrics;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

export class AgentRunLogger {
  async logStart(params: Omit<RunLogParams, 'status' | 'completedAt'>): Promise<void> {
    const db = getDB();
    await db.insert(agentRuns).values({
      id: params.runId,
      eventId: params.eventId,
      runType: params.runType,
      userId: params.fid,
      model: params.model ?? 'mock',
      status: 'pending',
      decision: params.decision ? JSON.stringify(params.decision) : null,
      output: params.actionResult ? { status: params.actionResult.status, output: params.actionResult.output } : {},
    });
  }

  async logCompletion(
    runId: string,
    decision: AgentDecision,
    actionResult: ActionResult,
    metrics: PipelineMetrics,
    completedAt: Date,
    errorMessage?: string
  ): Promise<void> {
    const db = getDB();
    const status: 'completed' | 'failed' = errorMessage ? 'failed' : 'completed';

    await db
      .update(agentRuns)
      .set({
        status,
        errorCode: errorMessage ?? null,
        output: { status: actionResult.status, output: actionResult.output, metrics },
      })
      .where(sql`id = ${runId}`);
  }
}

export const agentRunLogger = new AgentRunLogger();