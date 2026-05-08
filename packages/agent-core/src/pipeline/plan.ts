// pipeline/plan.ts — PlanGuard — enforces subscription/plan limits per user

import type { NormalizedEvent } from '@pulo/farcaster';
import type { PlanLimits, Plan } from '../types.js';
import { PLAN_LIMITS } from '../types.js';
import { getDB, schema } from '@pulo/db';
import { eq, and, gte, sql } from 'drizzle-orm';
import { PlanLimitExceededError } from '../errors.js';

const { agentEvents, agentRuns } = schema;

export class PlanGuard {
  getLimits(plan: Plan): PlanLimits {
    return PLAN_LIMITS[plan];
  }

  async checkEventLimit(fid: number, plan: Plan): Promise<void> {
    const limits = PLAN_LIMITS[plan];
    const db = getDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [count] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentEvents)
      .where(
        and(
          eq(agentEvents.fid, fid),
          gte(agentEvents.createdAt, today)
        )
      );

    if ((count?.count ?? 0) >= limits.maxEventsPerDay) {
      throw new PlanLimitExceededError(plan, `maxEventsPerDay (${limits.maxEventsPerDay})`);
    }
  }

  async checkReplyLimit(fid: number, plan: Plan): Promise<number> {
    const limits = PLAN_LIMITS[plan];
    const db = getDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [count] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentRuns)
      .where(
        and(
          eq(agentRuns.userId, fid),
          gte(agentRuns.createdAt, today)
        )
      );

    const used = count?.count ?? 0;
    const remaining = limits.maxRepliesPerDay - used;
    return Math.max(0, remaining);
  }

  async checkTruthCheckAllowed(plan: Plan): Promise<boolean> {
    return plan === 'pro' || plan === 'team';
  }

  async checkTrendAllowed(plan: Plan): Promise<boolean> {
    return plan === 'team';
  }

  decideMode(plan: Plan, action: string): 'draft' | 'publish' {
    if (plan === 'free') {
      if (['create_truth_check', 'create_trend', 'send_alert'].includes(action)) {
        return 'draft';
      }
    }
    return 'publish';
  }
}

export const planGuard = new PlanGuard();