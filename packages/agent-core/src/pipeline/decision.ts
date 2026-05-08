// pipeline/decision.ts — Decision engine — produces AgentDecision from context + intent

import type { AgentContext, AgentDecision, IntentClassification, SafetyResult } from '../types.js';

export class DecisionEngine {
  decide(
    intent: IntentClassification,
    context: AgentContext,
    preSafety: SafetyResult,
    postSafety: SafetyResult
  ): AgentDecision {
    // Critical safety blocks
    if (!preSafety.passed && preSafety.riskLevel === 'critical') {
      return this.escalate('pre-safety critical block', intent, context, 'low');
    }
    if (!postSafety.passed && postSafety.riskLevel === 'critical') {
      return this.escalate('post-safety critical block', intent, context, 'high');
    }
    if (!postSafety.passed && postSafety.riskLevel === 'high') {
      return this.saveDraft('post-safety high risk — requires approval', intent, context);
    }
    if (!preSafety.passed && preSafety.riskLevel === 'high') {
      return this.escalate(preSafety.reason, intent, context, 'medium');
    }

    switch (intent.category) {
      case 'dm':
      case 'mention_reply':
        return this.decideReply(intent, context);
      case 'thread_summary':
        return this.decideThreadSummary(intent, context);
      case 'truth_check':
        return this.decideTruthCheck(intent, context);
      case 'trend_alert':
        return this.decideTrendAlert(intent, context);
      case 'cast_summary':
        return this.decideCastSummary(intent, context);
      case 'reply_suggestion':
        return this.decideReplySuggestion(intent, context);
      case 'cast_rewrite':
        return this.decideCastRewrite(intent, context);
      case 'admin_action':
        return this.escalate('admin action required', intent, context, 'high');
      default:
        return this.ignore('unclear intent — ignoring', intent, context);
    }
  }

  private extractText(ctx: AgentContext): string {
    const ev = ctx.event;
    if (ev.type === 'mention') return ev.castText;
    if (ev.type === 'reply') return ev.castText;
    return ev.message;
  }

  private decideReply(intent: IntentClassification, ctx: AgentContext): AgentDecision {
    const text = this.extractText(ctx);
    const tone = intent.suggestedTone ?? ctx.preferences?.preferredReplyTone ?? 'concise';
    const maxLen = ctx.preferences?.maxCastLength ?? 320;

    if (!text || text.trim().length === 0) {
      return this.ignore('empty cast — ignoring', intent, ctx);
    }

    const blocked = ctx.preferences?.blockedWords ?? [];
    if (blocked.some(w => text.toLowerCase().includes(w.toLowerCase()))) {
      return this.ignore('blocked word detected', intent, ctx);
    }

    const replyText = this.generateReplyText(text, tone, maxLen, ctx);

    return {
      runType: intent.runType,
      action: { action: 'publish_reply', replyText },
      confidence: intent.confidence,
      reasoning: `Reply generated with tone=${tone}, maxLen=${maxLen}`,
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: ctx.user.plan === 'free',
    };
  }

  private generateReplyText(text: string, tone: string, maxLen: number, _ctx: AgentContext): string {
    const lower = text.toLowerCase();

    if (lower.includes('?')) {
      switch (tone) {
        case 'friendly':
          return `Great question! Let me help you out. Check our docs or feel free to ask more.`.slice(0, maxLen);
        case 'authoritative':
          return `Based on available data: here is the authoritative answer.`.slice(0, maxLen);
        default:
          return `Here's what I found: concise answer. Let me know if you need more detail.`.slice(0, maxLen);
      }
    }

    if (lower.includes('airdrop') || lower.includes('$')) {
      return `Interesting! This looks like it could be airdrop-related. Have you verified the source? Stay safe!`.slice(0, maxLen);
    }

    return `Thanks for the mention! I'm PULO — an AI agent on Far. How can I help?`.slice(0, maxLen);
  }

  private decideThreadSummary(intent: IntentClassification, ctx: AgentContext): AgentDecision {
    if (!ctx.relatedThread) {
      return this.saveDraft('thread not available for summary', intent, ctx);
    }
    return {
      runType: intent.runType,
      action: { action: 'save_draft', reason: 'thread_summary requires approval — draft saved' },
      confidence: intent.confidence,
      reasoning: `Thread summary for ${ctx.relatedThread.replies.length} replies`,
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: true,
    };
  }

  private decideTruthCheck(intent: IntentClassification, ctx: AgentContext): AgentDecision {
    const isPro = ctx.user.plan === 'pro' || ctx.user.plan === 'team';
    const text = this.extractText(ctx);

    if (!isPro) {
      return {
        runType: intent.runType,
        action: { action: 'save_draft', reason: 'truth_check requires pro/team plan — draft saved' },
        confidence: intent.confidence,
        reasoning: 'Plan limit: truth_check requires pro or team',
        preSafetyOk: true,
        postSafetyOk: true,
        requiresApproval: true,
      };
    }

    return {
      runType: intent.runType,
      action: {
        action: 'create_truth_check',
        question: this.extractQuestion(text),
        claim: text.slice(0, 500),
      },
      confidence: intent.confidence,
      reasoning: 'Truth check created',
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: false,
    };
  }

  private decideTrendAlert(intent: IntentClassification, ctx: AgentContext): AgentDecision {
    if (ctx.user.plan !== 'team') {
      return {
        runType: intent.runType,
        action: { action: 'save_draft', reason: 'trend_analysis requires team plan' },
        confidence: intent.confidence,
        reasoning: 'Plan limit: trend_analysis requires team',
        preSafetyOk: true,
        postSafetyOk: true,
        requiresApproval: true,
      };
    }

    const text = this.extractText(ctx);
    return {
      runType: intent.runType,
      action: { action: 'create_trend', topic: this.extractTopic(text), category: 'social' },
      confidence: intent.confidence,
      reasoning: 'Trend alert created',
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: true,
    };
  }

  private decideCastSummary(intent: IntentClassification, ctx: AgentContext): AgentDecision {
    return {
      runType: intent.runType,
      action: { action: 'save_draft', reason: 'cast_summary generated as draft' },
      confidence: intent.confidence,
      reasoning: 'Cast summary',
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: ctx.user.plan === 'free',
    };
  }

  private decideReplySuggestion(intent: IntentClassification, ctx: AgentContext): AgentDecision {
    const text = this.extractText(ctx);
    return {
      runType: intent.runType,
      action: { action: 'save_draft', reason: `reply_suggestion: "${text.slice(0, 30)}..."` },
      confidence: intent.confidence,
      reasoning: 'Reply suggestion',
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: false,
    };
  }

  private decideCastRewrite(intent: IntentClassification, ctx: AgentContext): AgentDecision {
    return {
      runType: intent.runType,
      action: { action: 'save_draft', reason: 'cast_rewrite requires manual review' },
      confidence: intent.confidence,
      reasoning: 'Cast rewrite',
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: true,
    };
  }

  private escalate(
    reason: string,
    intent: IntentClassification,
    ctx: AgentContext,
    priority: 'low' | 'medium' | 'high'
  ): AgentDecision {
    return {
      runType: intent.runType,
      action: { action: 'escalate_to_admin', reason, priority },
      confidence: intent.confidence,
      reasoning: `Escalated: ${reason}`,
      preSafetyOk: false,
      postSafetyOk: false,
      requiresApproval: true,
    };
  }

  private saveDraft(reason: string, intent: IntentClassification, ctx: AgentContext): AgentDecision {
    return {
      runType: intent.runType,
      action: { action: 'save_draft', reason },
      confidence: intent.confidence,
      reasoning: reason,
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: true,
    };
  }

  private ignore(reason: string, intent: IntentClassification, ctx: AgentContext): AgentDecision {
    return {
      runType: intent.runType,
      action: { action: 'ignore', reason },
      confidence: intent.confidence,
      reasoning: `Ignored: ${reason}`,
      preSafetyOk: true,
      postSafetyOk: true,
      requiresApproval: false,
    };
  }

  private extractQuestion(text: string): string {
    const match = text.match(/[^.!?]*[.?]/);
    return match ? match[0].trim() : text.slice(0, 100);
  }

  private extractTopic(text: string): string {
    return text.slice(0, 100).replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  }
}

export const decisionEngine = new DecisionEngine();