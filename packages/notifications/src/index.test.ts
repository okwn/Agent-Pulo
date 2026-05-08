import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  alertMatcher,
  userPreferenceMatcher,
  alertThrottle,
  deliveryPlanner,
  inboxDeliveryProvider,
  miniAppNotificationProvider,
  directCastProvider,
  alertTemplateRenderer,
  type Alert,
  type AlertContext,
  DeliveryChannel,
} from '../src/index.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const makePrefs = (overrides: Partial<{
  allowedTopics: string[];
  blockedTopics: string[];
  riskTolerance: string;
  notificationFrequency: string;
  dailyAlertLimit: number;
  allowMiniAppNotifications: boolean;
  allowDirectCasts: boolean;
}> = {}) => ({
  id: 1,
  userId: 1,
  language: 'en',
  tone: 'balanced',
  replyStyle: 'helpful',
  riskTolerance: 'medium',
  notificationFrequency: 'realtime',
  allowMiniAppNotifications: true,
  allowDirectCasts: false,
  allowedTopics: [],
  blockedTopics: [],
  preferredChannels: [],
  autoReplyMode: 'off',
  dailyAlertLimit: 50,
  dailyReplyLimit: 10,
  updatedAt: new Date(),
  ...overrides,
});

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'alert-1',
  userId: 1,
  type: 'trend_detected',
  title: 'Test Alert',
  body: 'Test body',
  metadata: {},
  createdAt: new Date(),
  ...overrides,
});

const makeCtx = (alert?: Alert, prefs?: ReturnType<typeof makePrefs>, tier: 'free' | 'pro' | 'team' | null = null): AlertContext => ({
  alert: alert ?? makeAlert(),
  userPrefs: prefs ?? makePrefs(),
  subscription: tier ? { tier } : null,
});

// ─── AlertMatcher ─────────────────────────────────────────────────────────────

describe('AlertMatcher', () => {
  it('allows alert when all preferences are open', () => {
    const result = alertMatcher.match(makeCtx());
    expect(result.shouldAlert).toBe(true);
  });

  it('blocks scam_warning when user not opted in', () => {
    const alert = makeAlert({ type: 'scam_warning' });
    const prefs = makePrefs({ allowedTopics: [] });
    const result = alertMatcher.match(makeCtx(alert, prefs));
    expect(result.shouldAlert).toBe(false);
    expect(result.blockedReason).toBe('user_not_opted_into_scam_alerts');
  });

  it('blocks topic not in allowedTopics', () => {
    const alert = makeAlert({ category: 'airdrop' });
    const prefs = makePrefs({ allowedTopics: ['grant', 'token_launch'] });
    const result = alertMatcher.match(makeCtx(alert, prefs));
    expect(result.shouldAlert).toBe(false);
  });

  it('allows topic that is in allowedTopics', () => {
    const alert = makeAlert({ category: 'airdrop' });
    const prefs = makePrefs({ allowedTopics: ['airdrop', '*'] });
    const result = alertMatcher.match(makeCtx(alert, prefs));
    expect(result.shouldAlert).toBe(true);
  });

  it('blocks high risk when user tolerance is low', () => {
    const alert = makeAlert({ riskLevel: 'high' });
    const prefs = makePrefs({ riskTolerance: 'low' });
    const result = alertMatcher.match(makeCtx(alert, prefs));
    expect(result.shouldAlert).toBe(false);
  });

  it('blocks non-weekly in minimal frequency mode', () => {
    const alert = makeAlert({ type: 'claim_detected' });
    const prefs = makePrefs({ notificationFrequency: 'minimal' });
    const result = alertMatcher.match(makeCtx(alert, prefs));
    expect(result.shouldAlert).toBe(false);
  });

  it('allows weekly_digest even in minimal mode', () => {
    const alert = makeAlert({ type: 'weekly_digest' });
    const prefs = makePrefs({ notificationFrequency: 'minimal' });
    const result = alertMatcher.match(makeCtx(alert, prefs));
    expect(result.shouldAlert).toBe(true);
  });
});

// ─── UserPreferenceMatcher ───────────────────────────────────────────────────

describe('UserPreferenceMatcher', () => {
  it('always allows inbox channel', () => {
    const prefs = makePrefs({ allowMiniAppNotifications: false, allowDirectCasts: false });
    const channels = userPreferenceMatcher.allowedChannels(makeAlert(), prefs);
    expect(channels).toContain('inbox');
  });

  it('includes miniapp when allowMiniAppNotifications is true', () => {
    const prefs = makePrefs({ allowMiniAppNotifications: true });
    const channels = userPreferenceMatcher.allowedChannels(makeAlert(), prefs);
    expect(channels).toContain('miniapp');
  });

  it('excludes miniapp when allowMiniAppNotifications is false', () => {
    const prefs = makePrefs({ allowMiniAppNotifications: false });
    const channels = userPreferenceMatcher.allowedChannels(makeAlert(), prefs);
    expect(channels).not.toContain('miniapp');
  });

  it('excludes direct_cast when allowDirectCasts is false', () => {
    const prefs = makePrefs({ allowDirectCasts: false });
    const channels = userPreferenceMatcher.allowedChannels(makeAlert(), prefs);
    expect(channels).not.toContain('direct_cast');
  });

  it('includes direct_cast when allowDirectCasts is true', () => {
    const prefs = makePrefs({ allowDirectCasts: true });
    const channels = userPreferenceMatcher.allowedChannels(makeAlert(), prefs);
    expect(channels).toContain('direct_cast');
  });
});

// ─── AlertThrottle ─────────────────────────────────────────────────────────────

describe('AlertThrottle', () => {
  it('allows alert under daily limit', () => {
    const result = alertThrottle.check(makeAlert(), makePrefs({ dailyAlertLimit: 50 }), 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(40);
  });

  it('blocks alert at daily limit', () => {
    const result = alertThrottle.check(makeAlert(), makePrefs({ dailyAlertLimit: 50 }), 50);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('daily_limit_reached');
  });

  it('allows alert slightly under daily limit', () => {
    const result = alertThrottle.check(makeAlert(), makePrefs({ dailyAlertLimit: 50 }), 49);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('blocks non-weekly in minimal frequency', () => {
    const alert = makeAlert({ type: 'claim_detected' });
    const prefs = makePrefs({ notificationFrequency: 'minimal' });
    const result = alertThrottle.check(alert, prefs, 0);
    expect(result.allowed).toBe(false);
  });

  it('remainingToday returns correct count', () => {
    const remaining = alertThrottle.remainingToday(makeAlert(), makePrefs({ dailyAlertLimit: 30 }), 12);
    expect(remaining).toBe(18);
  });
});

// ─── DeliveryPlanner ─────────────────────────────────────────────────────────

describe('DeliveryPlanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks direct_cast for free tier even when user enabled it', async () => {
    const alert = makeAlert();
    const prefs = makePrefs({ allowDirectCasts: true });
    const ctx = makeCtx(alert, prefs, 'free');

    const result = await deliveryPlanner.plan(ctx, 0);
    const directCastPlan = result.plans.find(p => p.channel === 'direct_cast');
    expect(directCastPlan).toBeUndefined();
  });

  it('plans inbox for all users regardless of tier', async () => {
    const alert = makeAlert();
    const prefs = makePrefs({ allowDirectCasts: true });
    const ctx = makeCtx(alert, prefs, 'free');

    const result = await deliveryPlanner.plan(ctx, 0);
    const inboxPlan = result.plans.find(p => p.channel === 'inbox');
    expect(inboxPlan).toBeDefined();
  });

  it('includes idempotency key in delivery plan', async () => {
    const alert = makeAlert({ id: 'test-alert-id' });
    const prefs = makePrefs();
    const ctx = makeCtx(alert, prefs, 'pro');

    const result = await deliveryPlanner.plan(ctx, 0);
    expect(result.plans.length).toBeGreaterThan(0);
    for (const plan of result.plans) {
      expect(plan.idempotencyKey).toContain(alert.id);
      expect(plan.idempotencyKey).toContain(String(alert.userId));
    }
  });
});

// ─── Providers ───────────────────────────────────────────────────────────────

describe('InboxDeliveryProvider', () => {
  it('has inbox as channel name', () => {
    expect(inboxDeliveryProvider.name).toBe('inbox');
  });
});

describe('MiniAppNotificationProvider', () => {
  it('has miniapp as channel name', () => {
    expect(miniAppNotificationProvider.name).toBe('miniapp');
  });
});

describe('DirectCastProvider', () => {
  it('has direct_cast as channel name', () => {
    expect(directCastProvider.name).toBe('direct_cast');
  });
});

// ─── AlertTemplateRenderer ───────────────────────────────────────────────────

describe('AlertTemplateRenderer', () => {
  it('renders claim medium risk template', () => {
    const alert = makeAlert({ type: 'claim_detected', riskLevel: 'medium', category: 'airdrop' });
    const template = alertTemplateRenderer.selectTemplate(alert);
    expect(template.templateId).toBe('claim_medium_risk');
  });

  it('renders claim high risk template', () => {
    const alert = makeAlert({ type: 'claim_detected', riskLevel: 'high', category: 'airdrop' });
    const template = alertTemplateRenderer.selectTemplate(alert);
    expect(template.templateId).toBe('claim_high_risk');
  });

  it('renders scam warning template', () => {
    const alert = makeAlert({ type: 'scam_warning' });
    const template = alertTemplateRenderer.selectTemplate(alert);
    expect(template.templateId).toBe('scam_warning');
  });

  it('renders reward program template', () => {
    const alert = makeAlert({ type: 'reward_program' });
    const template = alertTemplateRenderer.selectTemplate(alert);
    expect(template.templateId).toBe('reward_program');
  });

  it('renders truth check completed template', () => {
    const alert = makeAlert({ type: 'truth_check_ready' });
    const template = alertTemplateRenderer.selectTemplate(alert);
    expect(template.templateId).toBe('truth_check_completed');
  });

  it('interpolates variables into body', () => {
    const alert = makeAlert({ type: 'claim_detected', riskLevel: 'medium', category: 'airdrop' });
    const template = alertTemplateRenderer.selectTemplate(alert);
    const rendered = alertTemplateRenderer.render(template, alert, {
      category: 'airdrop',
    });
    expect(rendered.body).toContain('airdrop');
  });
});
