// @pulo/shared/src/index.ts — Public API for @pulo/shared
// Env validation, shared types, and mode configuration

import { z } from 'zod';

// ─── Core Env Schema ─────────────────────────────────────────────────────────

const portSchema = z.coerce.number().int().min(1).max(65535);
const postgresUrlSchema = z.string().url().startsWith('postgresql://');
const redisUrlSchema = z.string().url().startsWith('redis://');
const apiKeySchema = z.string().min(1).refine(
  (v) => !v.startsWith('sk-') || v.startsWith('sk-'),
  { message: 'API key appears to be a placeholder — replace with real key' }
);

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PULO_WEB_PORT: portSchema.default(4310),
  PULO_API_PORT: portSchema.default(4311),
  PULO_WORKER_PORT: portSchema.default(4312),
  PULO_POSTGRES_PORT: portSchema.default(5544),
  PULO_REDIS_PORT: portSchema.default(6388),
  DATABASE_URL: postgresUrlSchema,
  REDIS_URL: redisUrlSchema,
  OPENAI_API_KEY: apiKeySchema.optional(),
  ANTHROPIC_API_KEY: apiKeySchema.optional(),
  NEYNAR_API_KEY: apiKeySchema.optional(),
  NEYNAR_SIGNER_SECRET: z.string().optional(),
  FARCASTER_NEYNAR_API_KEY: apiKeySchema.optional(),
  FID: z.string().optional(),
  DEVELOPER_FID: z.string().optional(),
  VERIFIED_WALLETS: z.string().optional(),
  PULO_AGENT_ID: z.string().optional(),
  PULO_SIGNER_UUID: z.string().uuid().optional(),
  PULO_ADMIN_FIDS: z.string().optional(),
  ENABLE_TRUTH_ANALYSIS: z.coerce.boolean().default(true),
  ENABLE_TREND_RADAR: z.coerce.boolean().default(true),
  ENABLE_REWARD_DETECTION: z.coerce.boolean().default(true),
  ENABLE_AIRDROP_ALERTS: z.coerce.boolean().default(true),
  ENABLE_GRANT_ALERTS: z.coerce.boolean().default(true),
  MAX_CASTS_PER_USER_PER_DAY: z.coerce.number().int().default(50),
  MAX_DMS_PER_USER_PER_DAY: z.coerce.number().int().default(10),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().default(30),
  ALLOWED_CHANNELS: z.string().optional(),
  BLOCKED_USERS: z.string().optional(),
  LOGDNA_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  PULO_SERVICE_NAME: z.string().default('pulo'),
  PULO_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  PULO_FARCASTER_MODE: z.enum(['mock', 'live']).default('mock'),
  PULO_LLM_MODE: z.enum(['mock', 'openai', 'anthropic', 'local', 'auto']).default('mock'),
  PULO_AUTO_PRIMARY: z.enum(['openai', 'anthropic']).default('openai'),
  PULO_DEFAULT_SMALL_MODEL: z.string().optional(),
  PULO_DEFAULT_LARGE_MODEL: z.string().optional(),
  PULO_DAILY_LLM_COST_LIMIT_USD: z.coerce.number().default(5.0),
  PULO_SEARCH_MODE: z.enum(['mock', 'tavily', 'serpapi', 'disabled']).default('mock'),
  PULO_NOTIFICATION_MODE: z.enum(['mock', 'live']).default('mock'),
  PULO_BILLING_MODE: z.enum(['mock', 'stripe', 'hypersub', 'disabled']).default('mock'),
  PULO_AUTH_MODE: z.enum(['demo', 'farcaster', 'disabled']).default('demo'),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.format();
    throw new Error(`Invalid environment:\n${JSON.stringify(errors, null, 2)}`);
  }
  cachedEnv = result.data;
  return cachedEnv;
}

export function getPort(key: keyof Env, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

export const createAgentJobSchema = () => z.object({
  id: z.string(),
  type: z.enum(['reply', 'truth-check', 'trend', 'summarize']),
  fid: z.number().int().nonnegative(),
  payload: z.record(z.unknown()),
});

// ─── Provider Mode Configuration ──────────────────────────────────────────────

export type AppEnv = 'local' | 'staging' | 'production';
export type FarcaSterMode = 'mock' | 'live';
export type LlmMode = 'mock' | 'openai' | 'anthropic' | 'local' | 'auto';
export type SearchMode = 'mock' | 'tavily' | 'serpapi' | 'disabled';
export type NotificationMode = 'mock' | 'live';
export type BillingMode = 'mock' | 'stripe' | 'hypersub' | 'disabled';
export type AuthMode = 'demo' | 'farcaster' | 'disabled';

export interface KeyStatus {
  name: string;
  value: string;
  isSet: boolean;
  isPlaceholder: boolean;
  requiredFor: string[];
}

export interface ModeDiagnostic {
  app: AppEnv;
  farcaster: FarcaSterMode;
  llm: LlmMode;
  search: SearchMode;
  notification: NotificationMode;
  billing: BillingMode;
  auth: AuthMode;
  isHealthy: boolean;
  errors: string[];
  warnings: string[];
}

function isPlaceholder(val: string | undefined): boolean {
  if (!val) return false;
  return ['PLACEHOLDER', 'undefined', '', 'your-'].some(p => val.startsWith(p));
}

export function diagnoseModes(): ModeDiagnostic {
  const app = (process.env.PULO_APP_ENV ?? 'local') as AppEnv;
  const farcaster = (process.env.PULO_FARCASTER_MODE ?? 'mock') as FarcaSterMode;
  const llm = (process.env.PULO_LLM_MODE ?? 'mock') as LlmMode;
  const search = (process.env.PULO_SEARCH_MODE ?? 'mock') as SearchMode;
  const notification = (process.env.PULO_NOTIFICATION_MODE ?? 'mock') as NotificationMode;
  const billing = (process.env.PULO_BILLING_MODE ?? 'mock') as BillingMode;
  const auth = (process.env.PULO_AUTH_MODE ?? 'demo') as AuthMode;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (farcaster === 'live') {
    const val = process.env.NEYNAR_API_KEY ?? '';
    if (!val || isPlaceholder(val)) errors.push('NEYNAR_API_KEY is required for farcaster:live');
  }
  if (llm === 'openai') {
    const val = process.env.OPENAI_API_KEY ?? '';
    if (!val || isPlaceholder(val)) errors.push('OPENAI_API_KEY is required for llm:openai');
  }
  if (llm === 'anthropic') {
    const val = process.env.ANTHROPIC_API_KEY ?? '';
    if (!val || isPlaceholder(val)) errors.push('ANTHROPIC_API_KEY is required for llm:anthropic');
  }
  if (search === 'tavily') {
    const val = process.env.TAVILY_API_KEY ?? '';
    if (!val || isPlaceholder(val)) errors.push('TAVILY_API_KEY is required for search:tavily');
  }
  if (search === 'serpapi') {
    const val = process.env.SERPAPI_API_KEY ?? '';
    if (!val || isPlaceholder(val)) errors.push('SERPAPI_API_KEY is required for search:serpapi');
  }
  if (billing === 'stripe') {
    const val = process.env.STRIPE_SECRET_KEY ?? '';
    if (!val || isPlaceholder(val)) errors.push('STRIPE_SECRET_KEY is required for billing:stripe');
  }
  if (farcaster === 'mock' && process.env.NEYNAR_API_KEY && !isPlaceholder(process.env.NEYNAR_API_KEY)) {
    warnings.push('NEYNAR_API_KEY is set but farcaster mode is mock — key unused');
  }
  if (llm === 'mock') {
    if (process.env.OPENAI_API_KEY && !isPlaceholder(process.env.OPENAI_API_KEY)) {
      warnings.push('OPENAI_API_KEY is set but llm mode is mock — key unused');
    }
    if (process.env.ANTHROPIC_API_KEY && !isPlaceholder(process.env.ANTHROPIC_API_KEY)) {
      warnings.push('ANTHROPIC_API_KEY is set but llm mode is mock — key unused');
    }
  }

  return { app, farcaster, llm, search, notification, billing, auth, isHealthy: errors.length === 0, errors, warnings };
}