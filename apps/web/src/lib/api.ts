// API client for PULO web app

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4311';
const DEMO_COOKIE = 'pulo_demo_session';

interface ApiOptions {
  method?: string;
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward cookies for auth
  if (typeof document !== 'undefined') {
    const cookies = document.cookie;
    if (cookies) {
      headers['Cookie'] = cookies;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error ?? 'Request failed');
  }

  return res.json();
}

// Auth API
export interface AuthUser {
  id: number;
  fid: number;
  username: string;
  displayName: string | null;
  plan: string;
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>('/api/me');
  } catch {
    return null;
  }
}

export async function demoLogin(fid: number, username: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/auth/demo', {
    method: 'POST',
    body: { fid, username },
  });
}

// Settings API
export interface VoiceSettings {
  language: string;
  tone: 'balanced' | 'formal' | 'casual' | 'witty';
  replyStyle: 'helpful' | 'brief' | 'detailed' | 'persuasive';
  humorLevel: number;
  technicalDepth: number;
  conciseVsDetailed: number;
  exampleCasts: string[];
}

export interface AlertSettings {
  allowedTopics: string[];
  blockedTopics: string[];
  riskTolerance: 'low' | 'medium' | 'high';
  frequency: 'realtime' | 'digest' | 'minimal';
  allowMiniAppNotifications: boolean;
  allowDirectCasts: boolean;
  dailyAlertLimit: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface AutomationSettings {
  autoReplyMode: 'off' | 'draft' | 'publish';
  mentionOnlyMode: boolean;
  preferredChannels: string[];
}

export interface AllSettings {
  voice: Partial<VoiceSettings>;
  alerts: Partial<AlertSettings>;
  automation: Partial<AutomationSettings>;
}

export async function getSettings(): Promise<AllSettings> {
  return apiFetch<AllSettings>('/api/settings');
}

export async function updateSettings(settings: Partial<AllSettings>): Promise<AllSettings> {
  return apiFetch<AllSettings>('/api/settings', {
    method: 'PATCH',
    body: settings,
  });
}

export async function getVoiceSettings(): Promise<VoiceSettings> {
  return apiFetch<VoiceSettings>('/api/settings/voice');
}

export async function updateVoiceSettings(settings: Partial<VoiceSettings>): Promise<VoiceSettings> {
  return apiFetch<VoiceSettings>('/api/settings/voice', {
    method: 'PATCH',
    body: settings,
  });
}

export async function getAlertSettings(): Promise<AlertSettings> {
  return apiFetch<AlertSettings>('/api/settings/alerts');
}

export async function updateAlertSettings(settings: Partial<AlertSettings>): Promise<AlertSettings> {
  return apiFetch<AlertSettings>('/api/settings/alerts', {
    method: 'PATCH',
    body: settings,
  });
}

// Billing API
export type PlanTier = 'free' | 'pro' | 'creator' | 'community' | 'admin';

export interface PlanInfo {
  tier: PlanTier;
  name: string;
  status: 'active' | 'past_due' | 'canceled' | 'expired';
  expiresAt: string | null;
}

export interface PlanDetails {
  plan: PlanInfo;
  entitlements: {
    dailyTruthChecks: number;
    monthlyTruthChecks: number;
    radarInboxSize: number;
    radarAlertsEnabled: boolean;
    directCastAlerts: boolean;
    miniAppNotifications: boolean;
    weeklyDigest: boolean;
    autoDraftEnabled: boolean;
    voiceProfileEnabled: boolean;
    composerEnabled: boolean;
  };
}

export interface UsageInfo {
  castsUsed: number;
  castsLimit: number;
  truthChecksUsed: number;
  truthChecksLimit: number;
  trendsTracked: number;
  trendsLimit: number;
  periodStart: string;
  periodEnd: string;
}

export async function getBillingPlan(): Promise<PlanDetails> {
  return apiFetch<PlanDetails>('/api/billing/plan');
}

export async function getBillingUsage(): Promise<UsageInfo> {
  return apiFetch<UsageInfo>('/api/billing/usage');
}

export async function setUserPlan(userId: number, plan: PlanTier): Promise<{ success: boolean; userId: number; plan: PlanTier }> {
  return apiFetch(`/api/admin/users/${userId}/set-plan`, {
    method: 'POST',
    body: { plan },
  });
}

// ─── Composer Types ──────────────────────────────────────────────────────────

export type CastStyle = 'sharp' | 'founder' | 'technical' | 'funny' | 'concise' | 'thread';
export type DraftStatus = 'draft' | 'approved' | 'published' | 'ignored';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RewriteVariant {
  text: string;
  style: CastStyle;
  score: number;
  reasoning: string;
}

export interface ThreadPost {
  text: string;
  index: number;
  isHook: boolean;
}

export interface Thread {
  posts: ThreadPost[];
  totalLength: number;
  hook: string;
}

export interface CastRating {
  score: number;
  critique: string;
  suggestions: string[];
  hookScore: number;
  clarityScore: number;
  engagementScore: number;
  riskFlags: string[];
}

export interface HookSuggestion {
  hook: string;
  type: 'question' | 'statement' | 'number' | 'controversy' | 'emoji';
  score: number;
  reasoning: string;
}

export interface ChannelRecommendation {
  channel: string;
  relevance: number;
  reason: string;
  followerCount?: number;
}

export interface PublishCheck {
  safe: boolean;
  riskLevel: RiskLevel;
  issues: string[];
  warnings: string[];
}

export interface Draft {
  id: string;
  text: string;
  status: DraftStatus;
  score: number | null;
  reason: string | null;
  sourceCastHash: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

// ─── Composer API ─────────────────────────────────────────────────────────────

export async function rewriteCast(text: string, style: CastStyle): Promise<{ variant: RewriteVariant }> {
  return apiFetch<{ variant: RewriteVariant }>('/api/composer/rewrite', {
    method: 'POST',
    body: { text, style },
  });
}

export async function rewriteMultiple(text: string, styles: CastStyle[]): Promise<{ variants: RewriteVariant[] }> {
  return apiFetch<{ variants: RewriteVariant[] }>('/api/composer/rewrite-multiple', {
    method: 'POST',
    body: { text, styles },
  });
}

export async function buildThread(text: string, postCount: number = 5): Promise<Thread> {
  return apiFetch<Thread>('/api/composer/thread', {
    method: 'POST',
    body: { text, postCount },
  });
}

export async function rateCast(text: string): Promise<CastRating> {
  return apiFetch<CastRating>('/api/composer/rate', {
    method: 'POST',
    body: { text },
  });
}

export async function scoreHook(text: string): Promise<{ score: { score: number; factors: string[] }; suggestions: HookSuggestion[] }> {
  return apiFetch('/api/composer/hook-score', {
    method: 'POST',
    body: { text },
  });
}

export async function recommendChannels(text: string): Promise<{ recommendations: ChannelRecommendation[] }> {
  return apiFetch('/api/composer/channels', {
    method: 'POST',
    body: { text },
  });
}

export async function translateText(text: string, targetLang: 'en' | 'tr'): Promise<{ translated: string; sourceLang: string }> {
  return apiFetch('/api/composer/translate', {
    method: 'POST',
    body: { text, targetLang },
  });
}

export async function checkPublishSafety(text: string): Promise<PublishCheck> {
  return apiFetch<PublishCheck>('/api/composer/safety-check', {
    method: 'POST',
    body: { text },
  });
}

// ─── Draft Queue API ─────────────────────────────────────────────────────────

export interface DraftListResponse {
  drafts: Draft[];
}

export async function getDrafts(): Promise<DraftListResponse> {
  return apiFetch<DraftListResponse>('/api/drafts');
}

export async function createDraft(text: string, sourceCastHash?: string): Promise<Draft> {
  return apiFetch<Draft>('/api/drafts', {
    method: 'POST',
    body: { text, sourceCastHash },
  });
}

export async function getDraft(id: string): Promise<Draft> {
  return apiFetch<Draft>(`/api/drafts/${id}`);
}

export async function updateDraft(id: string, updates: { text?: string; status?: DraftStatus; score?: number | null; reason?: string | null }): Promise<Draft> {
  return apiFetch<Draft>(`/api/drafts/${id}`, {
    method: 'PATCH',
    body: updates,
  });
}

export async function publishDraft(id: string): Promise<{ success: boolean; draft: Draft; message: string }> {
  return apiFetch(`/api/drafts/${id}/publish`, {
    method: 'POST',
  });
}

export async function ignoreDraft(id: string): Promise<{ success: boolean; draft: Draft }> {
  return apiFetch(`/api/drafts/${id}/ignore`, {
    method: 'POST',
  });
}

export async function deleteDraft(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/drafts/${id}/delete`, {
    method: 'DELETE',
  });
}

// ─── Admin API Types ─────────────────────────────────────────────────────────

export type ErrorCode = 'FARCASTER_WEBHOOK_INVALID' | 'FARCASTER_CAST_FETCH_FAILED' | 'FARCASTER_PUBLISH_FAILED' | 'FARCASTER_RATE_LIMITED' | 'LLM_TIMEOUT' | 'LLM_INVALID_JSON' | 'LLM_BUDGET_EXCEEDED' | 'SAFETY_BLOCKED' | 'PLAN_LIMIT_EXCEEDED' | 'DUPLICATE_EVENT' | 'ALERT_CONSENT_MISSING' | 'DIRECT_CAST_FAILED' | 'DB_ERROR' | 'REDIS_ERROR' | 'UNKNOWN_ERROR';

export type ErrorCategory = 'FARCASTER' | 'LLM' | 'SAFETY' | 'PLAN' | 'ALERT' | 'INFRA' | 'UNKNOWN';

export type ErrorStatus = 'pending' | 'retrying' | 'resolved' | 'dead_lettered';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead';

export interface ErrorRecord {
  id: string;
  code: ErrorCode;
  category: ErrorCategory;
  message: string;
  retryable: boolean;
  retryCount: number;
  correlationId: string;
  jobId: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
  cause: string;
  status: ErrorStatus;
  lastRetryAt: string | null;
  nextRetryAt: string | null;
  resolvedAt: string | null;
}

export interface JobRecord {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  errorId: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string;
  completedAt: string | null;
}

export interface ErrorListResponse {
  errors: ErrorRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobListResponse {
  jobs: JobRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthStatus {
  status: 'operational' | 'degraded' | 'down';
  timestamp: string;
  services: {
    api: { status: string; latencyMs: number };
    database: { status: string; connections: number; latencyMs: number };
    redis: { status: string; memoryMb: number; connections: number };
    farcaster: { status: string; rateLimitRemaining: number };
    llm: { status: string; quotaRemaining: number };
  };
  metrics: {
    errorsLast24h: number;
    deadLetters: number;
    pendingJobs: number;
    runningJobs: number;
    failedJobs24h: number;
  };
}

// ─── Admin API ──────────────────────────────────────────────────────────────

export async function getAdminErrors(params?: {
  code?: ErrorCode;
  category?: ErrorCategory;
  status?: ErrorStatus;
  limit?: number;
  offset?: number;
}): Promise<ErrorListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.code) searchParams.set('code', params.code);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  return apiFetch<ErrorListResponse>(`/api/admin/errors?${searchParams}`);
}

export async function getAdminError(id: string): Promise<{ error: ErrorRecord }> {
  return apiFetch<{ error: ErrorRecord }>(`/api/admin/errors/${id}`);
}

export async function retryAdminError(id: string): Promise<{ success: boolean; jobId: string; error: ErrorRecord }> {
  return apiFetch(`/api/admin/errors/${id}/retry`, { method: 'POST' });
}

export async function createAdminError(data: {
  code: ErrorCode;
  message?: string;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; error: ErrorRecord }> {
  return apiFetch('/api/admin/errors', {
    method: 'POST',
    body: data,
  });
}

export async function getAdminJobs(params?: {
  type?: string;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}): Promise<JobListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  return apiFetch<JobListResponse>(`/api/admin/jobs?${searchParams}`);
}

export async function getAdminJob(id: string): Promise<{ job: JobRecord }> {
  return apiFetch<{ job: JobRecord }>(`/api/admin/jobs/${id}`);
}

export async function retryAdminJob(id: string): Promise<{ success: boolean; newJobId: string }> {
  return apiFetch(`/api/admin/jobs/${id}/retry`, { method: 'POST' });
}

export async function getAdminHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>('/api/admin/health');
}

export async function getAdminStats(): Promise<{
  errors: Record<string, number>;
  byCategory: Record<string, number>;
  jobs: Record<string, number>;
}> {
  return apiFetch('/api/admin/stats');
}

export async function getAdminEvents(params?: { type?: string; limit?: number; offset?: number }): Promise<{ events: unknown[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  return apiFetch(`/api/admin/events?${searchParams}`);
}

export async function getAdminSafetyFlags(): Promise<{ flags: unknown[] }> {
  return apiFetch('/api/admin/safety-flags');
}

export async function getAdminTruthChecks(): Promise<{ checks: unknown[] }> {
  return apiFetch('/api/admin/truth-checks');
}

export async function getAdminTrends(): Promise<{ trends: unknown[] }> {
  return apiFetch('/api/admin/trends');
}

export async function getAdminAlertLogs(): Promise<{ logs: unknown[] }> {
  return apiFetch('/api/admin/alert-logs');
}

export async function getAdminDebt(): Promise<{ debt: unknown[] }> {
  return apiFetch('/api/admin/debt');
}

// ─── Metrics API ─────────────────────────────────────────────────────────────

export interface MetricsSnapshot {
  metrics: MetricValue[];
  uptime: number;
  timestamp: string;
}

export interface MetricValue {
  name: string;
  type: 'counter' | 'histogram' | 'gauge';
  value: number;
  labels: Record<string, string>;
  timestamp: string;
}

export async function getMetrics(format: 'prometheus' | 'json' = 'prometheus'): Promise<string | MetricsSnapshot> {
  return apiFetch(`/metrics?format=${format}`);
}

export async function getDeepHealth(): Promise<{
  status: string;
  timestamp: string;
  uptime: number;
  checks: HealthCheckResult[];
  metrics: MetricsSnapshot;
}> {
  return apiFetch('/health/deep');
}

export interface HealthCheckResult {
  component: string;
  status: 'ok' | 'error' | 'degraded';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}
