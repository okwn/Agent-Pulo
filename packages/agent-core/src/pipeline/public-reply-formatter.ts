// agent-core/src/pipeline/public-reply-formatter.ts — Formats agent output into short public replies

import { createChildLogger } from '@pulo/observability';
import type { AgentDecision, AgentContext } from '../types.js';

const log = createChildLogger('public-reply-formatter');

// Max public reply length (Farcaster limit is 320 chars)
const MAX_PUBLIC_REPLY = 320;
const FREE_CTA = 'Try Pulo Pro for deeper analysis → pulo.xyz';
const PRO_DASHBOARD_LINK = 'View full report → pulo.xyz/dashboard/truth';

export class PublicReplyFormatter {
  /**
   * Format an agent decision into a public-facing reply string.
   */
  format(decision: AgentDecision, ctx: AgentContext): string {
    const action = decision.action.action;

    switch (action) {
      case 'publish_reply':
        return this.formatPublishReply(decision, ctx);

      case 'save_draft':
        return this.formatDraftSaved(decision, ctx);

      case 'create_truth_check':
        return this.formatTruthCheckCreated(decision, ctx);

      case 'create_trend':
        return this.formatTrendCreated(decision, ctx);

      case 'escalate_to_admin':
        return this.formatEscalation(decision);

      case 'ignore':
        return this.formatIgnored(decision);

      default:
        return this.formatUnknown(decision);
    }
  }

  private formatPublishReply(decision: AgentDecision, _ctx: AgentContext): string {
    const replyText = (decision.action as { action: 'publish_reply'; replyText?: string }).replyText ?? '';
    return replyText.length > MAX_PUBLIC_REPLY
      ? replyText.slice(0, MAX_PUBLIC_REPLY - 3) + '...'
      : replyText;
  }

  private formatDraftSaved(decision: AgentDecision, ctx: AgentContext): string {
    const reason: string = (decision.action as { action: 'save_draft'; reason?: string }).reason ?? 'draft saved';
    const isFree = ctx.user.plan === 'free';

    if (reason.includes('truth_check') && isFree) {
      return `Truth check queued! Pro users get instant analysis. ${FREE_CTA}`;
    }

    if (reason.includes('thread')) {
      return isFree
        ? `Thread summary ready! Pro users get it instantly. ${FREE_CTA}`
        : `Thread summary queued. Check your Pulo dashboard for the full breakdown.`;
    }

    if (reason.includes('reply_suggestion')) {
      const snippet = reason.replace('reply_suggestion: ', '').slice(0, 60);
      return `Draft reply created: "${snippet}" — check your dashboard.`;
    }

    if (reason.includes('cast_rewrite')) {
      return isFree
        ? `Rewritten! Upgrade to Pro for instant rewrites. ${FREE_CTA}`
        : `Your rewritten cast is in the dashboard — ready when you are.`;
    }

    if (reason.includes('requires approval') || reason.includes('draft saved')) {
      return `Got it! Your request is being prepared. Check pulo.xyz/dashboard for updates.`;
    }

    return `Your request is noted. Check pulo.xyz/dashboard for the full result.`;
  }

  private formatTruthCheckCreated(decision: AgentDecision, _ctx: AgentContext): string {
    const isPro = decision.confidence > 0.7;
    if (isPro) {
      return `Truth check running! Results at ${PRO_DASHBOARD_LINK}`;
    }
    return `Truth check queued. Pro users get instant verdicts. ${FREE_CTA}`;
  }

  private formatTrendCreated(decision: AgentDecision, _ctx: AgentContext): string {
    const topic = (decision.action as { topic?: string }).topic ?? 'trend';
    return `Trend alert created for "${topic.slice(0, 40)}". Track it at pulo.xyz/dashboard/radar`;
  }

  private formatEscalation(decision: AgentDecision): string {
    return `This needs team review — we'll get back to you shortly.`;
  }

  private formatIgnored(decision: AgentDecision): string {
    const reason: string = (decision.action as { action: 'ignore'; reason?: string }).reason ?? 'unknown';
    if (reason.includes('unclear intent') || reason.includes('unknown')) {
      return `Hey! I'm not sure what you meant — try "@pulo help" or visit pulo.xyz/dashboard`;
    }
    if (reason.includes('blocked') || reason.includes('safety')) {
      return `I can't help with that — reach out to the team if you think this is a mistake.`;
    }
    if (reason.includes('empty')) {
      return ''; // don't reply to empty casts
    }
    return `Got it. Reach out anytime!`;
  }

  private formatUnknown(decision: AgentDecision): string {
    return `Something unexpected happened — our team has been notified.`;
  }

  /**
   * Format a safety warning reply for risky claims.
   */
  formatSafetyWarning(ctx: AgentContext): string {
    const castText = ctx.event.type === 'mention' || ctx.event.type === 'reply' ? ctx.event.castText : ctx.event.message;
    const isAirdrop = castText.toLowerCase().includes('airdrop');
    const isToken = castText.toLowerCase().includes('token');

    if (isAirdrop || isToken) {
      return `Heads up — always verify airdrop claims via official channels before connecting your wallet. See pulo.xyz/dashboard/radar for tracked trends.`;
    }

    return `Stay cautious with claims like this — check the source before acting.`;
  }

  /**
   * Format a limit-exceeded CTA for free users.
   */
  formatLimitExceeded(): string {
    return `You've hit your free tier limit. Upgrade to Pro for ${FREE_CTA}`;
  }
}

export const publicReplyFormatter = new PublicReplyFormatter();
