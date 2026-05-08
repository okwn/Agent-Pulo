// agent-core/schema/outputs.ts — Zod schemas for structured agent outputs

import { z } from 'zod';

// ─── Intent Classification Schema ─────────────────────────────────────────────

export const IntentClassificationSchema = z.object({
  category: z.enum([
    'mention_reply',
    'thread_summary',
    'truth_check',
    'trend_alert',
    'cast_summary',
    'reply_suggestion',
    'cast_rewrite',
    'admin_action',
    'dm',
    'other',
  ]),
  runType: z.enum([
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
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(1000),
  suggestedTone: z.enum(['concise', 'friendly', 'authoritative', 'playful']).optional(),
  requiresBackgroundContext: z.boolean(),
});

export type IntentClassificationOutput = z.infer<typeof IntentClassificationSchema>;

// ─── Agent Decision Schema ─────────────────────────────────────────────────────

export const ActionDecisionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('publish_reply'),
    replyText: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal('save_draft'),
    reason: z.string(),
  }),
  z.object({
    action: z.literal('create_truth_check'),
    question: z.string().min(1).max(500),
    claim: z.string().min(1).max(1000),
  }),
  z.object({
    action: z.literal('create_trend'),
    topic: z.string().min(1).max(200),
    category: z.enum(['airdrop', 'grant', 'reward', 'token', 'program', 'governance', 'social']),
  }),
  z.object({
    action: z.literal('send_alert'),
    alertType: z.enum(['airdrop', 'grant', 'trend', 'safety', 'system']),
    message: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal('ignore'),
    reason: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal('escalate_to_admin'),
    reason: z.string().min(1).max(500),
    priority: z.enum(['low', 'medium', 'high']),
  }),
]);

export const AgentDecisionSchema = z.object({
  runType: z.enum([
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
  ]),
  action: ActionDecisionSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(2000),
  preSafetyOk: z.boolean(),
  postSafetyOk: z.boolean(),
  requiresApproval: z.boolean(),
});

export type AgentDecisionOutput = z.infer<typeof AgentDecisionSchema>;

// ─── Reply Output Schema ────────────────────────────────────────────────────────

export const ReplyOutputSchema = z.object({
  text: z.string().min(1).max(500),
  channelId: z.string().nullable(),
  parentHash: z.string().nullable(),
  idempotencyKey: z.string(),
  signerUuid: z.string().optional(), // required in live mode
});

export type ReplyOutput = z.infer<typeof ReplyOutputSchema>;

// ─── Truth Check Output Schema ─────────────────────────────────────────────────

export const TruthCheckOutputSchema = z.object({
  claim: z.string().min(1).max(1000),
  question: z.string().min(1).max(500),
  category: z.enum(['factual', 'contextual', 'sentiment', 'source_verification']),
  urgency: z.enum(['low', 'medium', 'high']),
  contextNeeded: z.array(z.string()).max(5),
  sourcesToCheck: z.array(z.string()).max(5),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
});

export type TruthCheckOutput = z.infer<typeof TruthCheckOutputSchema>;

// ─── Trend Output Schema ────────────────────────────────────────────────────────

export const TrendOutputSchema = z.object({
  topic: z.string().min(1).max(200),
  category: z.enum(['airdrop', 'grant', 'reward', 'token', 'program', 'governance', 'social']),
  confidence: z.number().min(0).max(1),
  castCount: z.number().int().nonnegative(),
  participantFids: z.array(z.number()).max(50),
  sampleCastHashes: z.array(z.string()).max(5),
  sentiment: z.enum(['bullish', 'bearish', 'neutral', 'mixed']),
  urgency: z.enum(['low', 'medium', 'high']),
  summary: z.string().min(1).max(500),
});

export type TrendOutput = z.infer<typeof TrendOutputSchema>;

// ─── Alert Output Schema ────────────────────────────────────────────────────────

export const AlertOutputSchema = z.object({
  alertType: z.enum(['airdrop', 'grant', 'trend', 'safety', 'system']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  targetFids: z.array(z.number()).max(100),
  targetChannels: z.array(z.string()).max(10),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  notificationPayload: z.object({
    title: z.string(),
    body: z.string(),
    targetUrl: z.string().optional(),
  }).optional(),
});

export type AlertOutput = z.infer<typeof AlertOutputSchema>;

// ─── Safety Assessment Schema ──────────────────────────────────────────────────

export const SafetyAssessmentSchema = z.object({
  passed: z.boolean(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  flags: z.array(z.object({
    type: z.enum(['hate_speech', 'spam', 'scam', 'misinformation', 'unsafe_url', 'pii', 'other']),
    severity: z.enum(['low', 'medium', 'high']),
    description: z.string(),
    content: z.string().optional(),
  })),
  summary: z.string().max(500),
  recommendedAction: z.enum(['approve', 'block', 'review', 'escalate']),
});

export type SafetyAssessment = z.infer<typeof SafetyAssessmentSchema>;

// ─── Run Log Schema ─────────────────────────────────────────────────────────────

export const AgentRunLogSchema = z.object({
  runId: z.string().uuid(),
  eventId: z.string(),
  runType: z.enum([
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
  ]),
  fid: z.number().int().nonnegative(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
  errorMessage: z.string().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  decision: z.string().optional(), // JSON string of AgentDecision
  actionResult: z.string().optional(), // JSON string of ActionResult
});

export type AgentRunLog = z.infer<typeof AgentRunLogSchema>;