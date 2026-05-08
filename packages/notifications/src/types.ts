// @pulo/notifications — Permission-based alerting types

// SubscriptionTier is a string union — no need to import from @pulo/db
export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';

// ─── Alert Types ─────────────────────────────────────────────────────────────

export type AlertType =
  | 'trend_detected'
  | 'claim_detected'
  | 'reward_program'
  | 'token_launch'
  | 'grant'
  | 'scam_warning'
  | 'truth_check_ready'
  | 'weekly_digest'
  | 'admin_message';

export type DeliveryChannel = 'inbox' | 'miniapp' | 'direct_cast';

export type AlertStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';

// ─── Alert Templates ──────────────────────────────────────────────────────────

export interface AlertTemplate {
  type: AlertType;
  title: string;
  body: string;
  templateId: string;
}

export const ALERT_TEMPLATES = {
  CLAIM_MEDIUM_RISK: {
    templateId: 'claim_medium_risk',
    type: 'claim_detected' as const,
    title: 'Claim Trending — Check Before You Connect',
    body: `Pulo Radar: A {category} claim is trending. Risk: Medium. I found active discussion, but no confirmed official source yet. Open Pulo before connecting any wallet.`,
  },
  CLAIM_HIGH_RISK: {
    templateId: 'claim_high_risk',
    type: 'claim_detected' as const,
    title: 'High-Risk Claim Alert',
    body: `Pulo Radar: A {category} claim shows high risk. Patterns detected: {riskFlags}. Do NOT click any links. Verify via official sources first.`,
  },
  REWARD_PROGRAM: {
    templateId: 'reward_program',
    type: 'reward_program' as const,
    title: 'Reward Program Detected',
    body: `Pulo Radar: A new {category} program is gaining traction. {point}. Check eligibility and official channels before participating.`,
  },
  TOKEN_LAUNCH: {
    templateId: 'token_launch',
    type: 'token_launch' as const,
    title: 'Token Launch Trending',
    body: `Pulo Radar: A token launch is trending in {channel}. Velocity: {velocity}/hr. Official confirmation: {onchain}. DYOR before engaging.`,
  },
  GRANT_HACKATHON: {
    templateId: 'grant_hackathon',
    type: 'grant' as const,
    title: 'Grant / Hackathon Opportunity',
    body: `Pulo Radar: {category} opportunity "{title}" detected. {authors} unique contributors. Apply via official channels only.`,
  },
  TRUTH_CHECK_COMPLETED: {
    templateId: 'truth_check_completed',
    type: 'truth_check_ready' as const,
    title: 'Truth Check Ready',
    body: `Your truth check on "{claim}" is complete. Verdict: {verdict} ({confidence}% confidence). View full report in Pulo.`,
  },
  SCAM_WARNING: {
    templateId: 'scam_warning',
    type: 'scam_warning' as const,
    title: '⚠️ Scam Warning Active',
    body: `Pulo Safety: Active scam campaign detected — {description}. Do NOT send funds to {addresses}. Report suspicious activity to the team.`,
  },
} satisfies Record<string, AlertTemplate>;

// ─── Core Interfaces ─────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  userId: number;
  type: AlertType;
  title: string;
  body: string;
  trendId?: string;
  truthCheckId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date | null;
}

export interface AlertDeliveryRecord {
  id: string;
  alertId: string;
  userId: number;
  channel: DeliveryChannel;
  status: AlertStatus;
  idempotencyKey: string;
  sentAt?: Date | null;
  openedAt?: Date | null;
  errorCode?: string | null;
}

export interface AlertContext {
  alert: Alert;
  userPrefs: {
    id?: number;
    userId: number;
    language?: string;
    tone?: string;
    replyStyle?: string;
    riskTolerance: string;
    notificationFrequency: string;
    allowMiniAppNotifications: boolean;
    allowDirectCasts: boolean;
    allowedTopics: string[];
    blockedTopics: string[];
    preferredChannels: string[];
    autoReplyMode: string;
    dailyAlertLimit: number;
    dailyReplyLimit: number;
    updatedAt: Date;
  };
  subscription: { tier: SubscriptionTier } | null;
}

export interface DeliveryPlan {
  channel: DeliveryChannel;
  alert: Alert;
  idempotencyKey: string;
  reason: string;
}

export interface DeliveryResult {
  channel: DeliveryChannel;
  success: boolean;
  errorCode?: string;
  deliveredAt?: Date;
}

// ─── Provider Interfaces ─────────────────────────────────────────────────────

export interface IAlertProvider {
  deliver(alert: Alert, userPrefs: AlertContext['userPrefs'], subscriptionTier: SubscriptionTier | null): Promise<DeliveryResult>;
}

export interface IAlertChannelProvider {
  send(alert: Alert, idempotencyKey: string): Promise<DeliveryResult>;
  name: DeliveryChannel;
}

// ─── Matching & Throttle ───────────────────────────────────────────────────────

export interface ThrottleState {
  dailySent: number;
  lastSentAt: Date | null;
  blockedUntil: Date | null;
}

export interface AlertMatcherResult {
  shouldAlert: boolean;
  matchedTopics: string[];
  blockedReason?: string;
}

export interface ThrottleResult {
  allowed: boolean;
  remaining: number;
  blockedUntil?: Date;
  reason?: string;
}

export interface DeliveryPlannerResult {
  plans: DeliveryPlan[];
  blockedPlans: { plan: DeliveryPlan; reason: string }[];
  totalDaily: number;
}

// ─── Render Context ─────────────────────────────────────────────────────────

export interface AlertRenderContext {
  title?: string;
  category?: string;
  riskLevel?: string;
  riskFlags?: string;
  point?: string;
  velocity?: number;
  onchain?: string;
  channel?: string;
  authors?: number;
  description?: string;
  addresses?: string;
  claim?: string;
  verdict?: string;
  confidence?: number;
  trendTitle?: string;
  trendScore?: number;
  trendVelocity?: number;
}
