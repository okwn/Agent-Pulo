// safety/src/types.ts — Core types for the safety layer

// ─── Safety Result ─────────────────────────────────────────────────────────────

export interface SafetyResult {
  safe: boolean;
  reason?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  flag?: SafetyFlag;
  confidence: number; // 0-1
}

export interface SafetyBlock {
  blocked: true;
  reason: string;
  flag: SafetyFlag;
  confidence: number;
  userFacingMessage: string;
}

export function blockResult(
  reason: string,
  flag: SafetyFlag,
  confidence: number,
  userFacingMessage: string
): SafetyBlock {
  return { blocked: true, reason, flag, confidence, userFacingMessage };
}

export function safeResult(confidence = 1.0): SafetyResult {
  return { safe: true, confidence };
}

// ─── Safety Flags ─────────────────────────────────────────────────────────────

export type SafetyFlag =
  | 'RATE_LIMIT_EXCEEDED'
  | 'PLAN_LIMIT_EXCEEDED'
  | 'DUPLICATE_REPLY'
  | 'AUTHOR_COOLDOWN'
  | 'CAST_COOLDOWN'
  | 'CHANNEL_COOLDOWN'
  | 'CONSENT_REQUIRED'
  | 'SCAM_RISK'
  | 'TOXIC_CONTENT'
  | 'FINANCIAL_ADVICE'
  | 'POLITICAL_CONTENT'
  | 'PRIVATE_DATA_LEAK'
  | 'LINK_RISK'
  | 'AUTO_PUBLISH_BLOCKED'
  | 'UNVERIFIED_CLAIM';

// ─── Safety Actions ────────────────────────────────────────────────────────────

export type SafetyAction =
  | 'reply'
  | 'mention_analysis'
  | 'reply_suggestion'
  | 'radar_alert'
  | 'direct_cast'
  | 'mini_app_notification'
  | 'auto_publish';

// ─── User Plan Tiers ──────────────────────────────────────────────────────────

export type UserPlan = 'free' | 'pro' | 'creator' | 'admin';

export interface PlanLimits {
  mentionAnalysesPerDay: number;
  replySuggestionsPerDay: number;
  radarAlertsPerDay: number;
  directCastAlerts: boolean;
  autoPublish: boolean;
  miniAppNotifications: boolean;
  logAllActions: boolean;
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  free: {
    mentionAnalysesPerDay: 5,
    replySuggestionsPerDay: 3,
    radarAlertsPerDay: 1,
    directCastAlerts: false,
    autoPublish: false,
    miniAppNotifications: false,
    logAllActions: false,
  },
  pro: {
    mentionAnalysesPerDay: 100,
    replySuggestionsPerDay: 50,
    radarAlertsPerDay: 10,
    directCastAlerts: true, // if opted in via consent
    autoPublish: false,
    miniAppNotifications: true,
    logAllActions: false,
  },
  creator: {
    mentionAnalysesPerDay: 500,
    replySuggestionsPerDay: 100,
    radarAlertsPerDay: 30,
    directCastAlerts: true,
    autoPublish: false, // requires separate consent
    miniAppNotifications: true,
    logAllActions: false,
  },
  admin: {
    mentionAnalysesPerDay: Infinity,
    replySuggestionsPerDay: Infinity,
    radarAlertsPerDay: Infinity,
    directCastAlerts: true,
    autoPublish: true,
    miniAppNotifications: true,
    logAllActions: true,
  },
};

// ─── Consent Types ─────────────────────────────────────────────────────────────

export type ConsentType =
  | 'direct_cast'
  | 'mini_app_notification'
  | 'auto_publish'
  | 'trend_alerts'
  | 'truth_check_alerts';

export interface UserConsents {
  directCast: boolean;
  miniAppNotifications: boolean;
  autoPublish: boolean;
  trendAlerts: boolean;
  truthCheckAlerts: boolean;
}

// ─── Safety Context ────────────────────────────────────────────────────────────

export interface SafetyContext {
  userId: number;
  userPlan: UserPlan;
  fid?: number;
  castHash?: string;
  authorFid?: number;
  channelId?: string;
  action: SafetyAction;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  content?: string;
  url?: string;
  claimConfidence?: number;
  isOfficialSource?: boolean;
}

// ─── Risk Assessment ──────────────────────────────────────────────────────────

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: SafetyFlag[];
  summary: string;
  score: number; // 0-1
}

// ─── Scam Keywords ────────────────────────────────────────────────────────────

export const SCAM_KEYWORDS = [
  'free token',
  'guaranteed profit',
  'must act now',
  'limited time offer',
  'claim your reward now',
  'send to receive',
  'airdrop confirmed',
  'private sale access',
  'whitelist spots',
  'double your tokens',
  '80% apy guaranteed',
];

export const FINANCIAL_ADVICE_PATTERNS = [
  /buy now/i,
  /sell now/i,
  /price will (?:go|shoot|skyrocket|drop)/i,
  /this token will (?:10x|100x|million)/i,
  /invest (?:all|your life savings)/i,
  /guaranteed return/i,
];

export const CAUTION_KEYWORDS = [
  'airdrop',
  'claim',
  'token',
  'reward',
  'bonus',
  'giveaway',
  'presale',
  'ico',
  'ido',
  'nft mint',
];

export const PRIVATE_DATA_PATTERNS = [
  /private[_-]?key/i,
  /seed[_-]?phrase/i,
  /secret[_-]?phrase/i,
  /\b0x[a-fA-F0-9]{64}\b/, // raw private key hex
];

export const SUSPICIOUS_LINK_PATTERNS = [
  /bit\.ly/i,
  /tinyurl\.com/i,
  /goo\.gl/i,
  /t\.co/i,
  /bit\.do/i,
  /ow\.ly/i,
  /is\.gd/i,
  /buff\.ly/i,
];
