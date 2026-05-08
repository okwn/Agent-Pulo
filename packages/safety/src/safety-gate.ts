// safety/src/safety-gate.ts — Main SafetyGate orchestrating all guards

import { createChildLogger } from '@pulo/observability';
import type {
  SafetyContext,
  SafetyResult,
  SafetyAction,
  UserPlan,
  UserConsents,
  SafetyBlock,
} from './types.js';
import { PLAN_LIMITS } from './types.js';
import { SafetyBlockError } from './errors.js';
import { checkPlanLimit, recordAction, enforcePlanLimit } from './plan-limits.js';
import {
  enforceDuplicateReply,
  enforceSameAuthorCooldown,
  enforceSameCastCooldown,
  enforceChannelCooldown,
  enforceConsent,
  enforceScamRisk,
  enforceFinancialAdvice,
  enforcePrivateData,
  enforceLinkRisk,
  enforceAutoPublish,
} from './guards/index.js';

const log = createChildLogger('safety-gate');

export interface SafetyGateConfig {
  userId: number;
  plan: UserPlan;
  consents: UserConsents;
}

export class SafetyGate {
  constructor(private config: SafetyGateConfig) {}

  /**
   * Run all safety checks for an action. Throws SafetyBlockError if blocked.
   * Returns void on success.
   */
  runOrThrow(context: Omit<SafetyContext, 'userId' | 'userPlan' | 'action'> & { action: SafetyAction }): void {
    const ctx: SafetyContext = {
      ...context,
      userId: this.config.userId,
      userPlan: this.config.plan,
    };

    const planLimits = PLAN_LIMITS[this.config.plan];

    // 1. Plan limit check
    if (planLimits.logAllActions) {
      log.info({ userId: ctx.userId, plan: ctx.userPlan, action: ctx.action }, 'admin action');
    }

    if (ctx.action !== 'auto_publish') {
      // Don't check plan limit for auto_publish — it's separately gated
      try {
        enforcePlanLimit({ userId: ctx.userId, plan: ctx.userPlan, action: ctx.action });
      } catch (err) {
        log.warn({ err, ctx }, 'plan limit block');
        throw err;
      }
    }

    // 2. Consent check
    if (ctx.action === 'direct_cast' || ctx.action === 'mini_app_notification' || ctx.action === 'auto_publish') {
      try {
        enforceConsent(ctx as SafetyContext & { action: 'direct_cast' | 'mini_app_notification' | 'auto_publish' }, this.config.consents);
      } catch (err) {
        log.warn({ err, ctx }, 'consent block');
        throw err;
      }
    }

    // 3. Spam prevention guards (only for reply actions)
    if (ctx.action === 'reply') {
      try {
        enforceDuplicateReply(ctx);
      } catch (err) {
        log.warn({ err, ctx }, 'duplicate reply block');
        throw err;
      }

      try {
        enforceSameAuthorCooldown(ctx);
      } catch (err) {
        log.warn({ err, ctx }, 'author cooldown block');
        throw err;
      }

      try {
        enforceSameCastCooldown(ctx);
      } catch (err) {
        log.warn({ err, ctx }, 'cast cooldown block');
        throw err;
      }

      if (ctx.channelId) {
        try {
          enforceChannelCooldown(ctx);
        } catch (err) {
          log.warn({ err, ctx }, 'channel cooldown block');
          throw err;
        }
      }
    }

    // 4. Content safety guards
    if (ctx.content) {
      // Private data check — always runs first (security critical)
      try {
        enforcePrivateData(ctx);
      } catch (err) {
        log.warn({ err, ctx }, 'private data block');
        throw err;
      }

      // Financial advice check
      try {
        enforceFinancialAdvice(ctx);
      } catch (err) {
        log.warn({ err, ctx }, 'financial advice block');
        throw err;
      }
    }

    // 5. URL risk check
    if (ctx.url) {
      try {
        enforceLinkRisk(ctx);
      } catch (err) {
        log.warn({ err, ctx }, 'link risk block');
        throw err;
      }
    }

    // 6. Scam risk check
    if (ctx.content) {
      try {
        enforceScamRisk(ctx);
      } catch (err) {
        log.warn({ err, ctx }, 'scam risk block');
        throw err;
      }
    }

    // 7. Auto-publish gate (extra layer beyond content guards)
    if (ctx.action === 'auto_publish') {
      try {
        enforceAutoPublish(ctx);
      } catch (err) {
        log.warn({ err, ctx }, 'auto-publish block');
        throw err;
      }
    }

    // 8. Record usage
    recordAction(ctx.userId, ctx.action);

    log.info({ userId: ctx.userId, action: ctx.action }, 'safety check passed');
  }

  /**
   * Run all checks without throwing — returns SafetyResult.
   */
  check(context: Omit<SafetyContext, 'userId' | 'userPlan' | 'action'> & { action: SafetyAction }): SafetyResult {
    const ctx: SafetyContext = {
      ...context,
      userId: this.config.userId,
      userPlan: this.config.plan,
    };

    // Plan limit check
    const planResult = checkPlanLimit({ userId: ctx.userId, plan: ctx.userPlan, action: ctx.action });
    if (!planResult.safe) return planResult;

    // Consent check
    if (ctx.action === 'direct_cast' || ctx.action === 'mini_app_notification' || ctx.action === 'auto_publish') {
      const { checkConsent } = require('./guards/consent.guard.js');
      const consentResult = checkConsent(ctx as any, this.config.consents);
      if (!consentResult.safe) return consentResult;
    }

    // Spam checks
    if (ctx.action === 'reply') {
      const { checkDuplicateReply } = require('./guards/duplicate-reply.guard.js');
      const dupResult = checkDuplicateReply(ctx);
      if (!dupResult.safe) return dupResult;

      const { checkSameAuthorCooldown } = require('./guards/cooldown.guard.js');
      const authorResult = checkSameAuthorCooldown(ctx);
      if (!authorResult.safe) return authorResult;

      const { checkSameCastCooldown } = require('./guards/cooldown.guard.js');
      const castResult = checkSameCastCooldown(ctx);
      if (!castResult.safe) return castResult;
    }

    // Content checks
    if (ctx.content) {
      const { checkPrivateData } = require('./guards/private-data.guard.js');
      const privateResult = checkPrivateData(ctx);
      if (!privateResult.safe) return privateResult;

      const { checkFinancialAdvice } = require('./guards/financial-advice.guard.js');
      const finResult = checkFinancialAdvice(ctx);
      if (!finResult.safe) return finResult;
    }

    if (ctx.url) {
      const { checkLinkRisk } = require('./guards/link-risk.guard.js');
      const linkResult = checkLinkRisk(ctx);
      if (!linkResult.safe) return linkResult;
    }

    return { safe: true, confidence: 1.0 };
  }
}
