// @pulo/db — Drizzle ORM schema for PULO
// Why Drizzle over Prisma: lightweight, SQL-like, no schema drift,
// tree-shakeable, migrations are plain SQL files you own.

import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uuid,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const planEnum = pgEnum('plan', ['free', 'pro', 'team']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deactivated']);
export const eventSourceEnum = pgEnum('event_source', ['webhook', 'worker', 'api', 'scheduler']);
export const eventTypeEnum = pgEnum('event_type', ['mention', 'reply', 'dm', 'trend_detected', 'truth_check_request', 'alert_triggered', 'auto_reply']);
export const eventStatusEnum = pgEnum('event_status', ['pending', 'processing', 'completed', 'failed', 'deduplicated']);
export const runStatusEnum = pgEnum('run_status', ['pending', 'running', 'completed', 'failed']);
export const draftStatusEnum = pgEnum('draft_status', ['pending', 'approved', 'published', 'rejected']);
export const verdictEnum = pgEnum('verdict', ['verified', 'likely_true', 'uncertain', 'likely_false', 'debunked']);
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high', 'critical', 'unknown']);
export const trendCategoryEnum = pgEnum('trend_category', ['airdrop', 'grant', 'reward', 'token', 'program', 'governance', 'social']);
export const trendStatusEnum = pgEnum('trend_status', ['active', 'fading', 'confirmed', 'debunked']);
export const radarTrendStatusEnum = pgEnum('radar_trend_status', ['detected', 'watching', 'approved', 'rejected', 'alerted', 'archived']);
export const radarCategoryEnum = pgEnum('radar_category', ['claim', 'reward_program', 'token_launch', 'airdrop', 'grant', 'hackathon', 'scam_warning', 'social_trend', 'unknown']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'sent', 'delivered', 'opened', 'failed']);
export const deliveryChannelEnum = pgEnum('delivery_channel', ['dm', 'cast_reply', 'miniapp', 'email', 'webhook']);
export const alertTypeEnum = pgEnum('alert_type', ['trend_detected', 'claim_detected', 'reward_program', 'token_launch', 'grant', 'scam_warning', 'truth_check_ready', 'weekly_digest', 'admin_message']);
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high', 'critical']);
export const subscriptionProviderEnum = pgEnum('subscription_provider', ['manual', 'stripe', 'paddle', 'lemon_squeezy']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'past_due', 'canceled', 'expired']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'pro', 'team', 'enterprise']);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fid: integer('fid').notNull().unique(),
  username: text('username').notNull(),
  displayName: text('display_name'),
  custodyAddress: text('custody_address'),
  verifiedAddresses: jsonb('verified_addresses').$type<string[]>().default([]),
  plan: planEnum('plan').default('free'),
  status: userStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_fid_idx').on(table.fid),
  index('users_username_idx').on(table.username),
  index('users_status_idx').on(table.status),
]);

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  language: text('language').default('en'),
  tone: text('tone').default('balanced'), // balanced, formal, casual, witty
  replyStyle: text('reply_style').default('helpful'), // helpful, brief, detailed, persuasive
  riskTolerance: text('risk_tolerance').default('medium'), // low, medium, high
  notificationFrequency: text('notification_frequency').default('realtime'), // realtime, digest, minimal
  allowMiniAppNotifications: boolean('allow_mini_app_notifications').default(true),
  allowDirectCasts: boolean('allow_direct_casts').default(false),
  allowedTopics: jsonb('allowed_topics').$type<string[]>().default([]),
  blockedTopics: jsonb('blocked_topics').$type<string[]>().default([]),
  preferredChannels: jsonb('preferred_channels').$type<string[]>().default([]),
  autoReplyMode: text('auto_reply_mode').default('off'), // off, draft, publish
  dailyAlertLimit: integer('daily_alert_limit').default(50),
  dailyReplyLimit: integer('daily_reply_limit').default(10),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_preferences_user_id_idx').on(table.userId),
]);

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: subscriptionProviderEnum('provider').default('manual'),
  externalSubscriptionId: text('external_subscription_id'),
  tier: subscriptionTierEnum('tier').default('free'),
  status: subscriptionStatusEnum('status').default('active'),
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('subscriptions_user_id_idx').on(table.userId),
  index('subscriptions_status_idx').on(table.status),
]);

export const casts = pgTable('casts', {
  id: serial('id').primaryKey(),
  castHash: text('cast_hash').notNull().unique(),
  authorFid: integer('author_fid').notNull(),
  authorUsername: text('author_username').notNull(),
  text: text('text').notNull(),
  channelId: text('channel_id'),
  parentHash: text('parent_hash'),
  rootParentHash: text('root_parent_hash'),
  rawJson: jsonb('raw_json').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  indexedAt: timestamp('indexed_at').defaultNow().notNull(),
}, (table) => [
  index('casts_cast_hash_idx').on(table.castHash),
  index('casts_author_fid_idx').on(table.authorFid),
  index('casts_parent_hash_idx').on(table.parentHash),
  index('casts_root_parent_hash_idx').on(table.rootParentHash),
  index('casts_created_at_idx').on(table.createdAt),
]);

export const castThreads = pgTable('cast_threads', {
  id: serial('id').primaryKey(),
  rootHash: text('root_hash').notNull().unique(),
  summary: text('summary'),
  castHashes: jsonb('cast_hashes').$type<string[]>().default([]),
  participants: jsonb('participants').$type<number[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('cast_threads_root_hash_idx').on(table.rootHash),
]);

export const agentEvents = pgTable('agent_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: eventSourceEnum('source').notNull(),
  type: eventTypeEnum('type').notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  fid: integer('fid'),
  castHash: text('cast_hash').references(() => casts.castHash, { onDelete: 'set null' }),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}),
  status: eventStatusEnum('status').default('pending'),
  dedupeKey: text('dedupe_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
}, (table) => [
  index('agent_events_dedupe_key_idx').on(table.dedupeKey),
  index('agent_events_status_idx').on(table.status),
  index('agent_events_type_idx').on(table.type),
  index('agent_events_created_at_idx').on(table.createdAt),
]);

export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => agentEvents.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  runType: text('run_type').notNull(), // reply, truth_check, trend_analysis, summarize
  model: text('model').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  costEstimate: text('cost_estimate'),
  status: runStatusEnum('status').default('pending'),
  decision: text('decision'),
  output: jsonb('output').$type<Record<string, unknown>>().default({}),
  errorCode: text('error_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('agent_runs_event_id_idx').on(table.eventId),
  index('agent_runs_user_id_idx').on(table.userId),
  index('agent_runs_status_idx').on(table.status),
  index('agent_runs_created_at_idx').on(table.createdAt),
]);

export const replyDrafts = pgTable('reply_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  castHash: text('cast_hash').notNull().references(() => casts.castHash, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  score: integer('score'), // 0-100 quality score from LLM
  status: draftStatusEnum('status').default('pending'),
  publishedCastHash: text('published_cast_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('reply_drafts_user_id_idx').on(table.userId),
  index('reply_drafts_cast_hash_idx').on(table.castHash),
  index('reply_drafts_status_idx').on(table.status),
]);

export const truthChecks = pgTable('truth_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  targetCastHash: text('target_cast_hash').references(() => casts.castHash, { onDelete: 'set null' }),
  claimText: text('claim_text').notNull(),
  verdict: verdictEnum('verdict'),
  confidence: integer('confidence'), // 0-100
  evidenceSummary: text('evidence_summary'),
  counterEvidenceSummary: text('counter_evidence_summary'),
  sourceCastHashes: jsonb('source_cast_hashes').$type<string[]>().default([]),
  riskLevel: riskLevelEnum('risk_level'),
  status: text('status').default('pending'), // pending, completed, failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('truth_checks_user_id_idx').on(table.userId),
  index('truth_checks_target_cast_hash_idx').on(table.targetCastHash),
  index('truth_checks_status_idx').on(table.status),
  index('truth_checks_created_at_idx').on(table.createdAt),
]);

export const trends = pgTable('trends', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  category: trendCategoryEnum('category').notNull(),
  keywords: jsonb('keywords').$type<string[]>().default([]),
  score: integer('score').default(0),
  velocity: integer('velocity').default(0), // mentions per hour
  riskLevel: riskLevelEnum('risk_level').default('low'),
  confidence: integer('confidence').default(0), // 0-100
  status: trendStatusEnum('status').default('active'),
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  sourceCount: integer('source_count').default(0),
  castCount: integer('cast_count').default(0),
  trustedAuthorCount: integer('trusted_author_count').default(0),
  summary: text('summary'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => [
  index('trends_category_idx').on(table.category),
  index('trends_status_idx').on(table.status),
  index('trends_score_idx').on(table.score),
  index('trends_velocity_idx').on(table.velocity),
  index('trends_first_seen_at_idx').on(table.firstSeenAt),
]);

export const trendSources = pgTable('trend_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  trendId: uuid('trend_id').notNull().references(() => trends.id, { onDelete: 'cascade' }),
  castHash: text('cast_hash').notNull().references(() => casts.castHash, { onDelete: 'cascade' }),
  authorFid: integer('author_fid').notNull(),
  channelId: text('channel_id'),
  text: text('text').notNull(),
  engagementScore: integer('engagement_score').default(0),
  trustScore: integer('trust_score').default(0), // 0-100
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('trend_sources_trend_id_idx').on(table.trendId),
  index('trend_sources_cast_hash_idx').on(table.castHash),
  index('trend_sources_author_fid_idx').on(table.authorFid),
]);

export const radarTrends = pgTable('radar_trends', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  normalizedTitle: text('normalized_title'),
  category: radarCategoryEnum('category').default('unknown'),
  keywords: jsonb('keywords').$type<string[]>().default([]),
  score: integer('score').default(0),
  velocity: integer('velocity').default(0),
  riskLevel: riskLevelEnum('risk_level').default('unknown'),
  confidence: integer('confidence').default(0),
  adminStatus: radarTrendStatusEnum('admin_status').default('detected'),
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  sourceCount: integer('source_count').default(0),
  castCount: integer('cast_count').default(0),
  trustedAuthorCount: integer('trusted_author_count').default(0),
  summary: text('summary'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => [
  index('radar_trends_category_idx').on(table.category),
  index('radar_trends_admin_status_idx').on(table.adminStatus),
  index('radar_trends_score_idx').on(table.score),
  index('radar_trends_velocity_idx').on(table.velocity),
  index('radar_trends_first_seen_at_idx').on(table.firstSeenAt),
]);

export const radarTrendSources = pgTable('radar_trend_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  trendId: uuid('trend_id').notNull().references(() => radarTrends.id, { onDelete: 'cascade' }),
  castHash: text('cast_hash').notNull(),
  authorFid: integer('author_fid').notNull(),
  authorUsername: text('author_username'),
  channelId: text('channel_id'),
  text: text('text').notNull(),
  engagementScore: integer('engagement_score').default(0),
  trustScore: integer('trust_score').default(0),
  hasSuspiciousLink: boolean('has_suspicious_link').default(false),
  hasClaimRisk: boolean('has_claim_risk').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('radar_trend_sources_trend_id_idx').on(table.trendId),
  index('radar_trend_sources_cast_hash_idx').on(table.castHash),
  index('radar_trend_sources_author_fid_idx').on(table.authorFid),
]);

export const radarKeywords = pgTable('radar_keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyword: text('keyword').notNull().unique(),
  category: radarCategoryEnum('category').default('unknown'),
  language: text('language').default('en'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const radarWatchedChannels = pgTable('radar_watched_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: text('channel_id').notNull().unique(),
  name: text('name').notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: alertTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  trendId: uuid('trend_id'),
  truthCheckId: uuid('truth_check_id'),
  riskLevel: riskLevelEnum('risk_level'),
  category: text('category'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('alerts_user_id_idx').on(table.userId),
  index('alerts_trend_id_idx').on(table.trendId),
  index('alerts_truth_check_id_idx').on(table.truthCheckId),
  index('alerts_created_at_idx').on(table.createdAt),
]);

export const alertDeliveries = pgTable('alert_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  channel: deliveryChannelEnum('channel').default('dm'),
  status: deliveryStatusEnum('status').default('pending'),
  idempotencyKey: text('idempotency_key').notNull(),
  sentAt: timestamp('sent_at'),
  openedAt: timestamp('opened_at'),
  errorCode: text('error_code'),
}, (table) => [
  index('alert_deliveries_user_id_idx').on(table.userId),
  index('alert_deliveries_alert_id_idx').on(table.alertId),
  index('alert_deliveries_idempotency_key_idx').on(table.idempotencyKey),
  index('alert_deliveries_status_idx').on(table.status),
]);

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  before: jsonb('before').$type<Record<string, unknown> | null>(),
  after: jsonb('after').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('admin_audit_logs_actor_user_id_idx').on(table.actorUserId),
  index('admin_audit_logs_entity_type_idx').on(table.entityType),
  index('admin_audit_logs_created_at_idx').on(table.createdAt),
]);

export const rateLimitEvents = pgTable('rate_limit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  fid: integer('fid'),
  key: text('key').notNull(),
  window: text('window').notNull(),
  count: integer('count').default(1),
  decision: text('decision').notNull(), // allowed, denied, throttled
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('rate_limit_events_user_id_idx').on(table.userId),
  index('rate_limit_events_key_idx').on(table.key),
  index('rate_limit_events_created_at_idx').on(table.createdAt),
]);

export const safetyFlags = pgTable('safety_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  castHash: text('cast_hash').references(() => casts.castHash, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(), // user, cast, channel
  entityId: text('entity_id').notNull(),
  reason: text('reason').notNull(),
  severity: severityEnum('severity').default('medium'),
  status: text('status').default('active'), // active, reviewed, cleared, escalated
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('safety_flags_user_id_idx').on(table.userId),
  index('safety_flags_cast_hash_idx').on(table.castHash),
  index('safety_flags_entity_type_idx').on(table.entityType),
  index('safety_flags_status_idx').on(table.status),
  index('safety_flags_severity_idx').on(table.severity),
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Cast = typeof casts.$inferSelect;
export type NewCast = typeof casts.$inferInsert;
export type CastThread = typeof castThreads.$inferSelect;
export type NewCastThread = typeof castThreads.$inferInsert;
export type AgentEvent = typeof agentEvents.$inferSelect;
export type NewAgentEvent = typeof agentEvents.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type ReplyDraft = typeof replyDrafts.$inferSelect;
export type NewReplyDraft = typeof replyDrafts.$inferInsert;
export type TruthCheck = typeof truthChecks.$inferSelect;
export type NewTruthCheck = typeof truthChecks.$inferInsert;
export type Trend = typeof trends.$inferSelect;
export type NewTrend = typeof trends.$inferInsert;
export type TrendSource = typeof trendSources.$inferSelect;
export type NewTrendSource = typeof trendSources.$inferInsert;
export type AlertDelivery = typeof alertDeliveries.$inferSelect;
export type NewAlertDelivery = typeof alertDeliveries.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
export type RateLimitEvent = typeof rateLimitEvents.$inferSelect;
export type NewRateLimitEvent = typeof rateLimitEvents.$inferInsert;
export type SafetyFlag = typeof safetyFlags.$inferSelect;
export type NewSafetyFlag = typeof safetyFlags.$inferInsert;
export type RadarTrend = typeof radarTrends.$inferSelect;
export type NewRadarTrend = typeof radarTrends.$inferInsert;
export type RadarTrendSource = typeof radarTrendSources.$inferSelect;
export type NewRadarTrendSource = typeof radarTrendSources.$inferInsert;
export type RadarKeyword = typeof radarKeywords.$inferSelect;
export type NewRadarKeyword = typeof radarKeywords.$inferInsert;
export type RadarWatchedChannel = typeof radarWatchedChannels.$inferSelect;
export type NewRadarWatchedChannel = typeof radarWatchedChannels.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';
