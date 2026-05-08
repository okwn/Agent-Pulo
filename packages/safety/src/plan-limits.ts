// safety/src/plan-limits.ts — Plan limits enforcement

import type { UserPlan, SafetyAction, SafetyContext, SafetyResult } from './types.js';
import { PLAN_LIMITS } from './types.js';
import { SafetyBlockError } from './errors.js';
import { DailyCounter } from './rate-limiter.js';

const dailyCounter = new DailyCounter();

function planLimitKey(userId: number, action: SafetyAction): string {
  return `${userId}:${action}`;
}

export interface PlanLimitsConfig {
  userId: number;
  plan: UserPlan;
  action: SafetyAction;
}

export function checkPlanLimit(config: PlanLimitsConfig): SafetyResult {
  const { userId, plan, action } = config;
  const limits = PLAN_LIMITS[plan];

  // Admin gets unlimited with logging
  if (plan === 'admin') {
    return { safe: true, confidence: 1.0 };
  }

  switch (action) {
    case 'mention_analysis': {
      const limit = limits.mentionAnalysesPerDay;
      const used = dailyCounter.get(planLimitKey(userId, action));
      if (used >= limit) {
        return {
          safe: false,
          reason: `Daily mention analysis limit reached: ${used}/${limit}`,
          flag: 'PLAN_LIMIT_EXCEEDED',
          confidence: 1.0,
        };
      }
      break;
    }

    case 'reply_suggestion': {
      const limit = limits.replySuggestionsPerDay;
      const used = dailyCounter.get(planLimitKey(userId, action));
      if (used >= limit) {
        return {
          safe: false,
          reason: `Daily reply suggestion limit reached: ${used}/${limit}`,
          flag: 'PLAN_LIMIT_EXCEEDED',
          confidence: 1.0,
        };
      }
      break;
    }

    case 'radar_alert': {
      const limit = limits.radarAlertsPerDay;
      const used = dailyCounter.get(planLimitKey(userId, action));
      if (used >= limit) {
        return {
          safe: false,
          reason: `Daily radar alert limit reached: ${used}/${limit}`,
          flag: 'PLAN_LIMIT_EXCEEDED',
          confidence: 1.0,
        };
      }
      break;
    }

    case 'direct_cast': {
      if (!limits.directCastAlerts) {
        return {
          safe: false,
          reason: `Direct cast alerts not available on ${plan} plan`,
          flag: 'PLAN_LIMIT_EXCEEDED',
          confidence: 1.0,
        };
      }
      break;
    }

    case 'auto_publish': {
      if (!limits.autoPublish) {
        return {
          safe: false,
          reason: `Auto-publish not available on ${plan} plan`,
          flag: 'AUTO_PUBLISH_BLOCKED',
          confidence: 1.0,
        };
      }
      break;
    }

    case 'mini_app_notification': {
      if (!limits.miniAppNotifications) {
        return {
          safe: false,
          reason: `Mini-app notifications not available on ${plan} plan`,
          flag: 'PLAN_LIMIT_EXCEEDED',
          confidence: 1.0,
        };
      }
      break;
    }
  }

  return { safe: true, confidence: 1.0 };
}

export function enforcePlanLimit(config: PlanLimitsConfig): void {
  const result = checkPlanLimit(config);
  if (!result.safe) {
    throw new SafetyBlockError(
      result.flag!,
      result.reason!,
      getUserFacingMessage(config.action, config.plan),
      result.confidence
    );
  }
}

export function recordAction(userId: number, action: SafetyAction): void {
  dailyCounter.increment(planLimitKey(userId, action));
}

export function getUsageCount(userId: number, action: SafetyAction): number {
  return dailyCounter.get(planLimitKey(userId, action));
}

export function getPlanLimitForAction(plan: UserPlan, action: SafetyAction): number {
  const limits = PLAN_LIMITS[plan];
  switch (action) {
    case 'mention_analysis': return limits.mentionAnalysesPerDay;
    case 'reply_suggestion': return limits.replySuggestionsPerDay;
    case 'radar_alert': return limits.radarAlertsPerDay;
    default: return Infinity;
  }
}

function getUserFacingMessage(action: SafetyAction, plan: UserPlan): string {
  switch (action) {
    case 'mention_analysis':
      return `You've reached your daily mention analysis limit on the ${plan} plan. Upgrade to Pro for more.`;
    case 'reply_suggestion':
      return `You've reached your daily reply suggestion limit on the ${plan} plan.`;
    case 'radar_alert':
      return `You've reached your daily radar alert limit on the ${plan} plan.`;
    case 'direct_cast':
      return `Direct cast alerts require a Pro or higher plan.`;
    case 'auto_publish':
      return `Auto-publish is not enabled on your plan.`;
    case 'mini_app_notification':
      return `Mini-app notifications require a Pro or higher plan.`;
    default:
      return `This action is not available on the ${plan} plan.`;
  }
}
