// agent-core/types.ts — Core types for the agent orchestration system

import type { NormalizedEvent } from '@pulo/farcaster';

// ─── Agent Run Types ───────────────────────────────────────────────────────────

export const AGENT_RUN_TYPES = [
  'mention_reply',
  'cast_summary',
  'thread_summary',
  'reply_suggestion',
  'cast_rewrite',
  'truth_check',
  'trend_analysis',
  'risk_analysis',
  'alert_generation',
  'admin_assist',
] as const;

export type AgentRunType = typeof AGENT_RUN_TYPES[number];

// ─── Plan / Subscription ────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro' | 'team';

export interface PlanLimits {
  maxEventsPerDay: number;
  maxRepliesPerDay: number;
  maxTruthChecksPerDay: number;
  maxTrendAlertsPerDay: number;
  premiumChannelsOnly: boolean;
  priorityProcessing: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxEventsPerDay: 50,
    maxRepliesPerDay: 10,
    maxTruthChecksPerDay: 5,
    maxTrendAlertsPerDay: 3,
    premiumChannelsOnly: true,
    priorityProcessing: false,
  },
  pro: {
    maxEventsPerDay: 500,
    maxRepliesPerDay: 100,
    maxTruthChecksPerDay: 50,
    maxTrendAlertsPerDay: 30,
    premiumChannelsOnly: false,
    priorityProcessing: true,
  },
  team: {
    maxEventsPerDay: 5000,
    maxRepliesPerDay: 1000,
    maxTruthChecksPerDay: 500,
    maxTrendAlertsPerDay: 300,
    premiumChannelsOnly: false,
    priorityProcessing: true,
  },
};

// ─── User Preferences ─────────────────────────────────────────────────────────

export interface UserPreferences {
  userId: number;
  fid: number;
  preferredReplyTone: 'concise' | 'friendly' | 'authoritative' | 'playful';
  maxCastLength: number; // default 320
  enableTruthChecks: boolean;
  enableTrendAlerts: boolean;
  enableAutoReplies: boolean;
  blockedWords: string[];
  allowedChannels: string[];
  customInstructions: string;
}

// ─── Safety ───────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SafetyResult {
  passed: boolean;
  riskLevel: RiskLevel;
  reason: string;
  flaggedContent?: string;
}

// ─── Intent Classification ─────────────────────────────────────────────────────

export type IntentCategory =
  | 'mention_reply'
  | 'thread_summary'
  | 'truth_check'
  | 'trend_alert'
  | 'cast_summary'
  | 'reply_suggestion'
  | 'cast_rewrite'
  | 'admin_action'
  | 'dm'
  | 'other';

export interface IntentClassification {
  category: IntentCategory;
  runType: AgentRunType;
  confidence: number; // 0–1
  reasoning: string;
  suggestedTone?: string;
  requiresBackgroundContext: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface AgentContext {
  event: NormalizedEvent;
  user: {
    fid: number;
    username: string;
    displayName: string | null;
    plan: Plan;
  };
  preferences: UserPreferences | null;
  recentCasts: import('@pulo/farcaster').Cast[];
  relatedThread: import('@pulo/farcaster').CastThread | null;
  relevantTrends: import('@pulo/farcaster').Cast[];
  createdAt: Date;
}

// ─── Decision ─────────────────────────────────────────────────────────────────

export type ActionDecision =
  | { action: 'publish_reply'; replyText: string }
  | { action: 'save_draft'; reason: string }
  | { action: 'create_truth_check'; question: string; claim: string }
  | { action: 'create_trend'; topic: string; category: string }
  | { action: 'send_alert'; alertType: string; message: string }
  | { action: 'ignore'; reason: string }
  | { action: 'escalate_to_admin'; reason: string; priority: 'low' | 'medium' | 'high' };

export interface AgentDecision {
  runType: AgentRunType;
  action: ActionDecision;
  confidence: number;
  reasoning: string;
  preSafetyOk: boolean;
  postSafetyOk: boolean;
  requiresApproval: boolean;
}

// ─── Action Result ─────────────────────────────────────────────────────────────

export type ActionStatus = 'published' | 'draft' | 'truth_check_created' | 'trend_created' | 'alert_sent' | 'ignored' | 'escalated' | 'failed';

export interface ActionResult {
  status: ActionStatus;
  output: unknown;
  url?: string;
  error?: string;
}

// ─── Pipeline Metadata ─────────────────────────────────────────────────────────

export interface PipelineMetrics {
  deduplicated: boolean;
  intentClassificationMs: number;
  contextBuildingMs: number;
  safetyPreCheckMs: number;
  safetyPostCheckMs: number;
  decisionMs: number;
  actionMs: number;
  totalMs: number;
}

export interface PipelineContext {
  event: NormalizedEvent;
  dedupeKey: string | null;
  actorUser: { fid: number; username: string } | null;
  userPreferences: UserPreferences | null;
  planLimits: PlanLimits;
  intent: IntentClassification | null;
  context: AgentContext | null;
  preSafety: SafetyResult | null;
  decision: AgentDecision | null;
  actionResult: ActionResult | null;
  metrics: PipelineMetrics;
  runId: string | null;
}