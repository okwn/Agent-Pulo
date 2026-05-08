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
  // ─── Application ───────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // ─── Ports ─────────────────────────────────────────────────
  PULO_WEB_PORT: portSchema.default(4310),
  PULO_API_PORT: portSchema.default(4311),
  PULO_WORKER_PORT: portSchema.default(4312),
  PULO_POSTGRES_PORT: portSchema.default(5544),
  PULO_REDIS_PORT: portSchema.default(6388),

  // ─── Database ──────────────────────────────────────────────
  DATABASE_URL: postgresUrlSchema,

  // ─── Redis ─────────────────────────────────────────────────
  REDIS_URL: redisUrlSchema,

  // ─── LLM / AI ──────────────────────────────────────────────
  OPENAI_API_KEY: apiKeySchema,
  ANTHROPIC_API_KEY: apiKeySchema,

  // ─── Neynar / Warpcast ─────────────────────────────────────
  NEYNAR_API_KEY: apiKeySchema,
  NEYNAR_SIGNER_SECRET: z.string().min(1),
  FARCASTER_NEYNAR_API_KEY: apiKeySchema.optional(),
  FID: z.string().optional(),
  DEVELOPER_FID: z.string().optional(),
  VERIFIED_WALLETS: z.string().optional(),

  // ─── Pulo Agent ─────────────────────────────────────────────
  PULO_AGENT_ID: z.string().optional(),
  PULO_SIGNER_UUID: z.string().uuid().optional(),
  PULO_ADMIN_FIDS: z.string().optional(),

  // ─── Feature Flags ──────────────────────────────────────────
  ENABLE_TRUTH_ANALYSIS: z.coerce.boolean().default(true),
  ENABLE_TREND_RADAR: z.coerce.boolean().default(true),
  ENABLE_REWARD_DETECTION: z.coerce.boolean().default(true),
  ENABLE_AIRDROP_ALERTS: z.coerce.boolean().default(true),
  ENABLE_GRANT_ALERTS: z.coerce.boolean().default(true),

  // ─── Safety & Limits ────────────────────────────────────────
  MAX_CASTS_PER_USER_PER_DAY: z.coerce.number().int().default(50),
  MAX_DMS_PER_USER_PER_DAY: z.coerce.number().int().default(10),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().default(30),
  ALLOWED_CHANNELS: z.string().optional(),
  BLOCKED_USERS: z.string().optional(),

  // ─── Observability ──────────────────────────────────────────
  LOGDNA_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),

  // ─── Service naming ─────────────────────────────────────────
  PULO_SERVICE_NAME: z.string().default('pulo'),
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

// ─── Agent Job Schema ────────────────────────────────────────────────────────

export const createAgentJobSchema = () => z.object({
  id: z.string(),
  type: z.enum(['reply', 'truth-check', 'trend', 'summarize']),
  fid: z.number().int().nonnegative(),
  payload: z.record(z.unknown()),
});