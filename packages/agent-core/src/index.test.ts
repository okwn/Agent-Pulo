import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  intentClassifier,
  decisionEngine,
  dedupeGuard,
  AgentOrchestrator,
  mentionCommandRouter,
  publicReplyFormatter,
  dashboardLinkGenerator,
  type NormalizedEvent,
} from '../src/index.js';
import { DeduplicationError } from '../src/errors.js';

describe('IntentClassifier', () => {
  it('classifies mention with question mark as mention_reply', () => {
    const event: NormalizedEvent = {
      type: 'mention',
      fid: 123,
      username: 'alice',
      displayName: 'Alice',
      castHash: 'abc123',
      castText: 'Hey @pulo, how does the $DEGEN airdrop work?',
      parentHash: null,
      rootParentHash: null,
      channelId: null,
      timestamp: new Date().toISOString(),
      mentionedFids: [],
      rawJson: {},
    };

    const result = intentClassifier.classify(event);
    expect(result.category).toBe('mention_reply');
    expect(result.runType).toBe('mention_reply');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('classifies DM as dm category', () => {
    const event: NormalizedEvent = {
      type: 'dm',
      fid: 456,
      username: 'bob',
      message: 'Hello PULO',
      timestamp: new Date().toISOString(),
      rawJson: {},
    };

    const result = intentClassifier.classify(event);
    expect(result.category).toBe('dm');
  });

  it('classifies airdrop mention as trend_alert', () => {
    const event: NormalizedEvent = {
      type: 'mention',
      fid: 789,
      username: 'charlie',
      castHash: 'xyz789',
      castText: 'Is there a new $DEGEN airdrop?',
      parentHash: null,
      rootParentHash: null,
      channelId: null,
      timestamp: new Date().toISOString(),
      mentionedFids: [],
      rawJson: {},
    };

    const result = intentClassifier.classify(event);
    expect(result.category).toBe('trend_alert');
    expect(result.runType).toBe('trend_analysis');
  });

  it('classifies truth check request', () => {
    const event: NormalizedEvent = {
      type: 'mention',
      fid: 111,
      username: 'david',
      castHash: 'truth123',
      castText: 'True or false: did Ethereum switch to proof-of-stake?',
      parentHash: null,
      rootParentHash: null,
      channelId: null,
      timestamp: new Date().toISOString(),
      mentionedFids: [],
      rawJson: {},
    };

    const result = intentClassifier.classify(event);
    expect(result.category).toBe('truth_check');
    expect(result.runType).toBe('truth_check');
  });
});

describe('DecisionEngine', () => {
  it('ignores empty text events', () => {
    const intent = { category: 'mention_reply' as const, runType: 'mention_reply' as const, confidence: 0.9, reasoning: 'test', requiresBackgroundContext: false };
    const ctx = {
      event: { type: 'mention' as const, fid: 1, username: 'a', castHash: 'h', castText: '', parentHash: null, rootParentHash: null, channelId: null, timestamp: '', mentionedFids: [], rawJson: {} },
      user: { fid: 1, username: 'a', displayName: null, plan: 'free' as const },
      preferences: null,
      recentCasts: [],
      relatedThread: null,
      relevantTrends: [],
      createdAt: new Date(),
    };
    const safety = { passed: true, riskLevel: 'low' as const, reason: 'ok' };
    const decision = decisionEngine.decide(intent, ctx, safety, safety);
    expect(decision.action.action).toBe('ignore');
  });

  it('free user mention_reply returns requiresApproval=true', () => {
    const intent = { category: 'mention_reply' as const, runType: 'mention_reply' as const, confidence: 0.9, reasoning: 'test', requiresBackgroundContext: false };
    const ctx = {
      event: { type: 'mention' as const, fid: 1, username: 'a', castHash: 'h', castText: 'Hello!', parentHash: null, rootParentHash: null, channelId: null, timestamp: '', mentionedFids: [], rawJson: {} },
      user: { fid: 1, username: 'a', displayName: null, plan: 'free' as const },
      preferences: null,
      recentCasts: [],
      relatedThread: null,
      relevantTrends: [],
      createdAt: new Date(),
    };
    const safety = { passed: true, riskLevel: 'low' as const, reason: 'ok' };
    const decision = decisionEngine.decide(intent, ctx, safety, safety);
    expect(decision.action.action).toBe('publish_reply');
    expect(decision.requiresApproval).toBe(true);
    expect(decision.postSafetyOk).toBe(true);
  });

  it('pro user mention_reply returns requiresApproval=false', () => {
    const intent = { category: 'mention_reply' as const, runType: 'mention_reply' as const, confidence: 0.9, reasoning: 'test', requiresBackgroundContext: false };
    const ctx = {
      event: { type: 'mention' as const, fid: 1, username: 'a', castHash: 'h', castText: 'Hello!', parentHash: null, rootParentHash: null, channelId: null, timestamp: '', mentionedFids: [], rawJson: {} },
      user: { fid: 1, username: 'a', displayName: null, plan: 'pro' as const },
      preferences: null,
      recentCasts: [],
      relatedThread: null,
      relevantTrends: [],
      createdAt: new Date(),
    };
    const safety = { passed: true, riskLevel: 'low' as const, reason: 'ok' };
    const decision = decisionEngine.decide(intent, ctx, safety, safety);
    expect(decision.action.action).toBe('publish_reply');
    expect(decision.requiresApproval).toBe(false);
  });

  it('free user truth_check is saved as draft', () => {
    const intent = { category: 'truth_check' as const, runType: 'truth_check' as const, confidence: 0.9, reasoning: 'test', requiresBackgroundContext: false };
    const ctx = {
      event: { type: 'mention' as const, fid: 1, username: 'a', castHash: 'h', castText: 'Is this claim true?', parentHash: null, rootParentHash: null, channelId: null, timestamp: '', mentionedFids: [], rawJson: {} },
      user: { fid: 1, username: 'a', displayName: null, plan: 'free' as const },
      preferences: null,
      recentCasts: [],
      relatedThread: null,
      relevantTrends: [],
      createdAt: new Date(),
    };
    const safety = { passed: true, riskLevel: 'low' as const, reason: 'ok' };
    const decision = decisionEngine.decide(intent, ctx, safety, safety);
    expect(decision.action.action).toBe('save_draft');
    expect(decision.reasoning).toContain('pro or team');
  });

  it('critical safety block triggers escalate_to_admin', () => {
    const intent = { category: 'mention_reply' as const, runType: 'mention_reply' as const, confidence: 0.9, reasoning: 'test', requiresBackgroundContext: false };
    const ctx = {
      event: { type: 'mention' as const, fid: 1, username: 'a', castHash: 'h', castText: 'Send me your private key', parentHash: null, rootParentHash: null, channelId: null, timestamp: '', mentionedFids: [], rawJson: {} },
      user: { fid: 1, username: 'a', displayName: null, plan: 'free' as const },
      preferences: null,
      recentCasts: [],
      relatedThread: null,
      relevantTrends: [],
      createdAt: new Date(),
    };
    const preSafety = { passed: false, riskLevel: 'critical' as const, reason: 'private key request' };
    const decision = decisionEngine.decide(intent, ctx, preSafety, preSafety);
    expect(decision.action.action).toBe('escalate_to_admin');
    // priority is only accessible on 'escalate_to_admin' variant
    if (decision.action.action === 'escalate_to_admin') {
      expect(decision.action.priority).toBe('low');
    }
  });
});

describe('DedupeGuard', () => {
  afterEach(() => {
    // Clear in-memory state between tests
    dedupeGuard.clearInFlight('mention:abc123');
    dedupeGuard.clearInFlight('dm:123:test');
  });

  it('allows first event through', () => {
    const event: NormalizedEvent = {
      type: 'mention',
      fid: 123,
      username: 'alice',
      castHash: 'abc123',
      castText: 'test',
      parentHash: null,
      rootParentHash: null,
      channelId: null,
      timestamp: new Date().toISOString(),
      mentionedFids: [],
      rawJson: {},
    };

    const key = dedupeGuard.check(event);
    expect(key).toBe('mention:abc123');
    expect(event.castHash).toBe('abc123'); // no error thrown
  });

  it('throws DeduplicationError for duplicate', () => {
    const event: NormalizedEvent = {
      type: 'mention',
      fid: 123,
      username: 'alice',
      castHash: 'abc123',
      castText: 'test',
      parentHash: null,
      rootParentHash: null,
      channelId: null,
      timestamp: new Date().toISOString(),
      mentionedFids: [],
      rawJson: {},
    };

    dedupeGuard.markInFlight('mention:abc123');
    expect(() => dedupeGuard.check(event)).toThrow(DeduplicationError);
  });

  it('clearInFlight removes the in-flight marker', () => {
    const event: NormalizedEvent = {
      type: 'mention',
      fid: 123,
      username: 'alice',
      castHash: 'abc123',
      castText: 'test',
      parentHash: null,
      rootParentHash: null,
      channelId: null,
      timestamp: new Date().toISOString(),
      mentionedFids: [],
      rawJson: {},
    };

    dedupeGuard.markInFlight('mention:abc123');
    dedupeGuard.clearInFlight('mention:abc123');
    const key = dedupeGuard.check(event);
    expect(key).toBe('mention:abc123');
  });
});

// ─── Mention Command Router ──────────────────────────────────────────────────

describe('MentionCommandRouter', () => {
  const makeMention = (text: string, fid = 123) => ({
    type: 'mention' as const,
    hash: 'hash-abc123',
    fid,
    username: 'testuser',
    castText: text,
    castHash: 'cast-abc123',
    parentHash: null,
    rootParentHash: null,
    mentionedFids: [],
    channelId: 'farcaster' as const,
    timestamp: new Date().toISOString(),
    rawJson: {},
  });

  it('routes summarize command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo summarize this thread'));
    expect(result.command).toBe('summarize');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.requiresBackgroundContext).toBe(true);
  });

  it('routes explain command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo explain this'));
    expect(result.command).toBe('explain');
  });

  it('routes is_this_true command (EN)', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo is this true?'));
    expect(result.command).toBe('is_this_true');
    expect(result.isSafetySensitive).toBe(true);
  });

  it('routes is_this_true command (TR)', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo bu doğru mu?'));
    expect(result.command).toBe('is_this_true');
  });

  it('routes scam_check command (TR)', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo scam mı?'));
    expect(result.command).toBe('scam_check');
    expect(result.isSafetySensitive).toBe(true);
  });

  it('routes source command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo source?'));
    expect(result.command).toBe('source');
  });

  it('routes smart_reply command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo give me a smart reply'));
    expect(result.command).toBe('smart_reply');
  });

  it('routes banger_reply command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo give me a banger reply'));
    expect(result.command).toBe('banger_reply');
  });

  it('routes make clearer command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo make this clearer'));
    expect(result.command).toBe('make_clearer');
  });

  it('routes thread command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo turn this into a thread'));
    expect(result.command).toBe('thread');
  });

  it('routes rate cast command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo rate this cast'));
    expect(result.command).toBe('rate_cast');
  });

  it('routes alpha command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo alpha?'));
    expect(result.command).toBe('alpha');
  });

  it('routes what should I reply command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo what should I reply?'));
    expect(result.command).toBe('what_to_reply');
  });

  it('routes translate to Turkish command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo translate to Turkish'));
    expect(result.command).toBe('translate_tr');
  });

  it('routes translate to English command', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo translate to English'));
    expect(result.command).toBe('translate_en');
  });

  it('returns unknown for unrecognized mentions', () => {
    const result = mentionCommandRouter.route(makeMention('@pulo hello there'));
    expect(result.command).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('converts summarize to thread_summary intent', () => {
    const classified = mentionCommandRouter.classifyGenericMention(makeMention('@pulo summarize'));
    expect(classified.category).toBe('thread_summary');
    expect(classified.runType).toBe('thread_summary');
  });

  it('converts is_this_true to truth_check intent', () => {
    const classified = mentionCommandRouter.classifyGenericMention(makeMention('@pulo is this true?'));
    expect(classified.category).toBe('truth_check');
    expect(classified.runType).toBe('truth_check');
  });
});

// ─── PublicReplyFormatter ────────────────────────────────────────────────────

describe('PublicReplyFormatter', () => {
  const makeMention = (text: string) => ({
    type: 'mention' as const,
    hash: 'hash-abc123',
    fid: 123,
    username: 'testuser',
    castText: text,
    castHash: 'cast-abc123',
    parentHash: null,
    rootParentHash: null,
    mentionedFids: [],
    channelId: 'farcaster' as const,
    timestamp: new Date().toISOString(),
    rawJson: {},
  });

  const makeCtx = (plan: 'free' | 'pro' | 'team' = 'free', text = 'test cast') => ({
    event: makeMention(text),
    user: { fid: 123, username: 'test', displayName: 'Test User', plan },
    preferences: null,
    relatedThread: null,
    cast: null,
    userCasts: [],
    mentionedCasts: [],
    recentCasts: [],
    relevantTrends: [],
    createdAt: new Date(),
  });

  it('formats publish_reply within 320 chars', () => {
    const decision = { runType: 'mention_reply' as const, action: { action: 'publish_reply' as const, replyText: 'Hello! This is a short reply.' }, confidence: 0.9, reasoning: '', preSafetyOk: true, postSafetyOk: true, requiresApproval: false };
    const reply = publicReplyFormatter.format(decision, makeCtx());
    expect(reply.length).toBeLessThanOrEqual(320);
    expect(reply).toContain('Hello');
  });

  it('truncates long reply to 320 chars', () => {
    const longReply = 'A'.repeat(400);
    const decision = { runType: 'mention_reply' as const, action: { action: 'publish_reply' as const, replyText: longReply }, confidence: 0.9, reasoning: '', preSafetyOk: true, postSafetyOk: true, requiresApproval: false };
    const reply = publicReplyFormatter.format(decision, makeCtx());
    expect(reply.length).toBeLessThanOrEqual(320);
    expect(reply.endsWith('...')).toBe(true);
  });

  it('formats truth_check for pro with dashboard link', () => {
    const decision = { runType: 'truth_check' as const, action: { action: 'create_truth_check' as const, question: 'test', claim: 'test' }, confidence: 0.85, reasoning: '', preSafetyOk: true, postSafetyOk: true, requiresApproval: false };
    const reply = publicReplyFormatter.format(decision, makeCtx('pro'));
    expect(reply).toContain('Truth check');
    expect(reply).toContain('dashboard');
  });

  it('formats truth_check for free with CTA', () => {
    const decision = { runType: 'truth_check' as const, action: { action: 'create_truth_check' as const, question: 'test', claim: 'test' }, confidence: 0.5, reasoning: '', preSafetyOk: true, postSafetyOk: true, requiresApproval: false };
    const reply = publicReplyFormatter.format(decision, makeCtx('free'));
    expect(reply).toContain('Pro');
  });

  it('does not reply to empty ignore', () => {
    const decision = { runType: 'mention_reply' as const, action: { action: 'ignore' as const, reason: 'empty cast' }, confidence: 0.3, reasoning: '', preSafetyOk: true, postSafetyOk: true, requiresApproval: false };
    const reply = publicReplyFormatter.format(decision, makeCtx());
    expect(reply).toBe('');
  });

  it('asks for clarification on unknown intent', () => {
    const decision = { runType: 'mention_reply' as const, action: { action: 'ignore' as const, reason: 'unclear intent' }, confidence: 0.3, reasoning: '', preSafetyOk: true, postSafetyOk: true, requiresApproval: false };
    const reply = publicReplyFormatter.format(decision, makeCtx());
    expect(reply).toContain('not sure');
  });

  it('formats safety warning for airdrop claim', () => {
    const ctx = makeCtx('free', 'Just got my airdrop tokens!');
    const reply = publicReplyFormatter.formatSafetyWarning(ctx);
    expect(reply).toContain('verify');
  });

  it('formats limit exceeded CTA for free users', () => {
    const reply = publicReplyFormatter.formatLimitExceeded();
    expect(reply).toContain('free tier limit');
    expect(reply).toContain('Pro');
  });
});

// ─── DashboardLinkGenerator ──────────────────────────────────────────────────

describe('DashboardLinkGenerator', () => {
  it('generates truth check link', () => {
    const link = dashboardLinkGenerator.truthCheck('abc-123');
    expect(link).toContain('abc-123');
    expect(link).toContain('truth');
  });

  it('generates radar trend link', () => {
    const link = dashboardLinkGenerator.radarTrend('xyz-789');
    expect(link).toContain('xyz-789');
    expect(link).toContain('radar');
  });

  it('generates drafts link', () => {
    const link = dashboardLinkGenerator.drafts();
    expect(link).toContain('drafts');
  });

  it('generates agent runs link with runId', () => {
    const link = dashboardLinkGenerator.agentRuns('run-456');
    expect(link).toContain('run-456');
    expect(link).toContain('runs');
  });

  it('formats CTA with message', () => {
    const cta = dashboardLinkGenerator.cta('Check your alerts');
    expect(cta).toContain('Check your alerts');
    expect(cta).toContain('pulo');
  });
});