// Admin routes — errors, jobs, health, system operations

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  InMemoryErrorStore,
  InMemoryRetryQueue,
  DeadLetterQueue,
  AppError,
  ERROR_CODES,
  ERROR_CATEGORIES,
  createError,
  generateCorrelationId,
  type ErrorCode,
  type ErrorStatus,
  type JobStatus,
  type ErrorFilter,
  type JobFilter,
  type AppErrorRecord,
} from '@pulo/errors';
import { DEMO_COOKIE, verifyDemoSessionToken } from '@pulo/auth';
import { logAuditEvent, type AuditAction } from '@pulo/observability';

// ─── Service Instances ─────────────────────────────────────────────────────────

const errorStore = new InMemoryErrorStore();
const retryQueue = new InMemoryRetryQueue();
const deadLetterQueue = new DeadLetterQueue();

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function getUserFromCookie(req: FastifyRequest) {
  const cookieHeader = req.headers.cookie ?? '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const token = cookies[DEMO_COOKIE];
  if (!token) return null;
  const payload = verifyDemoSessionToken(token);
  if (!payload) return null;
  return { fid: payload.fid, isAdmin: payload.fid === 1 };
}

async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = await getUserFromCookie(req);
  if (!user || !user.isAdmin) {
    return reply.status(403).send({ error: 'Admin access required' });
  }
  return user;
}

// ─── Error Routes ─────────────────────────────────────────────────────────────

export async function adminErrorRoutes(app: FastifyInstance) {

  // GET /api/admin/errors - List all errors
  app.get('/api/admin/errors', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const querySchema = z.object({
      code: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['pending', 'retrying', 'resolved', 'dead_lettered']).optional(),
      retryable: z.enum(['true', 'false']).optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query params', details: parsed.error.errors });
    }

    const { code, category, status, retryable, limit, offset } = parsed.data;

    const filter: ErrorFilter = {};
    if (code && Object.values(ERROR_CODES).includes(code as ErrorCode)) {
      filter.code = code as ErrorCode;
    }
    if (category && Object.values(ERROR_CATEGORIES).includes(category as any)) {
      filter.category = category as any;
    }
    if (status) {
      filter.status = status as ErrorStatus;
    }
    if (retryable !== undefined) {
      filter.retryable = retryable === 'true';
    }

    const [errors, total] = await Promise.all([
      errorStore.findAll(filter),
      errorStore.count(filter),
    ]);

    return {
      errors: errors.slice(offset, offset + limit),
      total,
      limit,
      offset,
    };
  });

  // GET /api/admin/errors/:id - Get error detail
  app.get('/api/admin/errors/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const { id } = req.params as { id: string };
    const error = await errorStore.findById(id);

    if (!error) {
      return reply.status(404).send({ error: 'Error not found' });
    }

    return { error };
  });

  // POST /api/admin/errors/:id/retry - Retry error
  app.post('/api/admin/errors/:id/retry', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const { id } = req.params as { id: string };
    const error = await errorStore.findById(id);

    if (!error) {
      return reply.status(404).send({ error: 'Error not found' });
    }

    if (error.status === 'resolved') {
      return reply.status(400).send({ error: 'Error already resolved' });
    }

    if (!error.retryable) {
      return reply.status(400).send({
        error: 'Error is not retryable',
        code: error.code,
        reason: 'Non-retryable error code',
      });
    }

    const appError = new AppError({
      code: error.code as ErrorCode,
      message: error.message,
      correlationId: error.correlationId,
      retryCount: error.retryCount + 1,
      retryable: true,
      metadata: error.metadata,
    });

    const jobId = await retryQueue.enqueue({
      type: `retry_${error.code}`,
      payload: {
        originalErrorId: id,
        correlationId: error.correlationId,
      },
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      errorId: id,
      scheduledAt: new Date(Date.now() + appError.getRetryDelay()),
      completedAt: null,
    });

    await errorStore.update(id, {
      status: 'retrying',
      lastRetryAt: new Date().toISOString(),
      nextRetryAt: new Date(Date.now() + appError.getRetryDelay()).toISOString(),
    });

    // Audit log admin action
    await logAuditEvent({
      action: 'ERROR_RETRY',
      actorFid: admin.fid,
      actorType: 'admin',
      targetType: 'error',
      targetId: id,
      metadata: { errorCode: error.code, newJobId: jobId },
      correlationId: error.correlationId ?? undefined,
      ipAddress: req.ip ?? undefined,
    });

    return {
      success: true,
      jobId,
      error: await errorStore.findById(id),
    };
  });

  // POST /api/admin/errors - Create test error (for demo)
  app.post('/api/admin/errors', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const bodySchema = z.object({
      code: z.enum([
        'FARCASTER_WEBHOOK_INVALID',
        'FARCASTER_CAST_FETCH_FAILED',
        'FARCASTER_PUBLISH_FAILED',
        'FARCASTER_RATE_LIMITED',
        'LLM_TIMEOUT',
        'LLM_INVALID_JSON',
        'LLM_BUDGET_EXCEEDED',
        'SAFETY_BLOCKED',
        'PLAN_LIMIT_EXCEEDED',
        'DUPLICATE_EVENT',
        'ALERT_CONSENT_MISSING',
        'DIRECT_CAST_FAILED',
        'DB_ERROR',
        'REDIS_ERROR',
        'UNKNOWN_ERROR',
      ]),
      message: z.string().optional(),
      retryable: z.boolean().optional(),
      metadata: z.record(z.unknown()).optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const error = createError(
      parsed.data.code,
      parsed.data.message ?? `Test error: ${parsed.data.code}`,
      {
        retryable: parsed.data.retryable,
        metadata: parsed.data.metadata,
        correlationId: generateCorrelationId(),
      }
    );

    const id = await errorStore.save(error);

    return { id, error: await errorStore.findById(id) };
  });
}

// ─── Job Routes ────────────────────────────────────────────────────────────────

export async function adminJobRoutes(app: FastifyInstance) {

  // GET /api/admin/jobs - List all jobs
  app.get('/api/admin/jobs', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const querySchema = z.object({
      type: z.string().optional(),
      status: z.enum(['pending', 'running', 'completed', 'failed', 'dead']).optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query params', details: parsed.error.errors });
    }

    const { type, status, limit, offset } = parsed.data;

    const filter: JobFilter = {};
    if (type) filter.type = type;
    if (status) filter.status = status as JobStatus;

    const [jobs, total] = await Promise.all([
      retryQueue.findAll(filter),
      retryQueue.count(filter),
    ]);

    return {
      jobs: jobs.slice(offset, offset + limit),
      total,
      limit,
      offset,
    };
  });

  // GET /api/admin/jobs/:id - Get job detail
  app.get('/api/admin/jobs/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const { id } = req.params as { id: string };
    const job = await retryQueue.findById(id);

    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    return { job };
  });

  // POST /api/admin/jobs/:id/retry - Retry job
  app.post('/api/admin/jobs/:id/retry', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const { id } = req.params as { id: string };
    const job = await retryQueue.findById(id);

    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    if (job.status === 'pending' || job.status === 'running') {
      return reply.status(400).send({ error: 'Job is not in a failed/dead state' });
    }

    const newJobId = await retryQueue.enqueue({
      type: job.type,
      payload: job.payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: job.maxAttempts,
      errorId: job.errorId,
      scheduledAt: new Date(Date.now() + 1000), // 1 second delay
      completedAt: null,
    });

    // Log admin action
    console.log(`[AUDIT] Admin ${admin.fid} retried job ${id}, new job: ${newJobId}`);

    return {
      success: true,
      newJobId,
    };
  });

  // DELETE /api/admin/jobs/:id - Cancel job
  app.delete('/api/admin/jobs/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const { id } = req.params as { id: string };
    const job = await retryQueue.findById(id);

    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    await retryQueue.update(id, { status: 'dead' });

    console.log(`[AUDIT] Admin ${admin.fid} cancelled job ${id}`);

    return { success: true };
  });
}

// ─── Health Routes ─────────────────────────────────────────────────────────────

export async function adminHealthRoutes(app: FastifyInstance) {

  // GET /api/admin/health - System health overview
  app.get('/api/admin/health', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    // Mock health data
    const health = {
      status: 'operational' as const,
      timestamp: new Date().toISOString(),
      services: {
        api: { status: 'operational' as const, latencyMs: 45 },
        database: { status: 'operational' as const, connections: 24, latencyMs: 12 },
        redis: { status: 'operational' as const, memoryMb: 67, connections: 8 },
        farcaster: { status: 'operational' as const, rateLimitRemaining: 145 },
        llm: { status: 'operational' as const, quotaRemaining: 8500 },
      },
      metrics: {
        errorsLast24h: await errorStore.count({ status: 'pending' }),
        deadLetters: await deadLetterQueue.count(),
        pendingJobs: await retryQueue.count({ status: 'pending' }),
        runningJobs: await retryQueue.count({ status: 'running' }),
        failedJobs24h: await retryQueue.count({ status: 'failed' }),
      },
    };

    return health;
  });

  // GET /api/admin/stats - Dashboard stats
  app.get('/api/admin/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const stats = {
      errors: {
        total: await errorStore.count(),
        pending: await errorStore.count({ status: 'pending' }),
        retrying: await errorStore.count({ status: 'retrying' }),
        resolved: await errorStore.count({ status: 'resolved' }),
        deadLettered: await errorStore.count({ status: 'dead_lettered' }),
      },
      byCategory: {
        FARCASTER: await errorStore.count({ category: 'FARCASTER' }),
        LLM: await errorStore.count({ category: 'LLM' }),
        SAFETY: await errorStore.count({ category: 'SAFETY' }),
        PLAN: await errorStore.count({ category: 'PLAN' }),
        ALERT: await errorStore.count({ category: 'ALERT' }),
        INFRA: await errorStore.count({ category: 'INFRA' }),
      },
      jobs: {
        total: await retryQueue.count(),
        pending: await retryQueue.count({ status: 'pending' }),
        running: await retryQueue.count({ status: 'running' }),
        completed: await retryQueue.count({ status: 'completed' }),
        failed: await retryQueue.count({ status: 'failed' }),
      },
    };

    return stats;
  });
}

// ─── System Operations Routes ────────────────────────────────────────────────

export async function adminSystemRoutes(app: FastifyInstance) {

  // GET /api/admin/events - Event log
  app.get('/api/admin/events', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const querySchema = z.object({
      type: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    // Mock events
    const events = [
      { id: 'evt_1', type: 'error', severity: 'error', message: 'LLM_TIMEOUT in truth-check', timestamp: new Date(Date.now() - 300000).toISOString(), correlationId: 'corr_123' },
      { id: 'evt_2', type: 'job', severity: 'info', message: 'Job completed: radar_scan_123', timestamp: new Date(Date.now() - 600000).toISOString(), correlationId: 'corr_124' },
      { id: 'evt_3', type: 'safety', severity: 'warning', message: 'Safety flag: potential spam', timestamp: new Date(Date.now() - 900000).toISOString(), correlationId: 'corr_125' },
      { id: 'evt_4', type: 'trend', severity: 'info', message: 'Trend approved: LayerZero Airdrop', timestamp: new Date(Date.now() - 1200000).toISOString(), correlationId: 'corr_126' },
      { id: 'evt_5', type: 'user', severity: 'info', message: 'User plan changed: fid_123 -> pro', timestamp: new Date(Date.now() - 1500000).toISOString(), correlationId: 'corr_127' },
    ];

    return { events: events.slice(parsed.data.offset, parsed.data.offset + parsed.data.limit), total: events.length };
  });

  // GET /api/admin/safety-flags - Safety flags
  app.get('/api/admin/safety-flags', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const flags = [
      { id: 'flag_1', type: 'misinformation', severity: 'high', description: 'Claim about token presale', reporter: 'automated', castHash: '0x1234...', status: 'pending', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'flag_2', type: 'spam', severity: 'medium', description: 'Repetitive promotional casts', reporter: 'user_report', status: 'pending', createdAt: new Date(Date.now() - 7200000).toISOString() },
    ];

    return { flags };
  });

  // POST /api/admin/safety-flags/:id/resolve - Resolve safety flag
  app.post('/api/admin/safety-flags/:id/resolve', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const { id } = req.params as { id: string };
    console.log(`[AUDIT] Admin ${admin.fid} resolved safety flag ${id}`);

    return { success: true };
  });

  // POST /api/admin/safety-flags/:id/dismiss - Dismiss safety flag
  app.post('/api/admin/safety-flags/:id/dismiss', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const { id } = req.params as { id: string };
    console.log(`[AUDIT] Admin ${admin.fid} dismissed safety flag ${id}`);

    return { success: true };
  });

  // GET /api/admin/truth-checks - Truth check reviews
  app.get('/api/admin/truth-checks', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const checks = [
      { id: 'truth_1', claim: 'Bitcoin max supply is 21 million', verdict: 'true', confidence: 0.99, status: 'approved', createdAt: new Date(Date.now() - 1800000).toISOString() },
      { id: 'truth_2', claim: 'ETH merge happened in Sept 2022', verdict: 'true', confidence: 0.97, status: 'approved', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'truth_3', claim: 'Uniswap processed $1T volume', verdict: 'misleading', confidence: 0.67, status: 'pending', createdAt: new Date(Date.now() - 5400000).toISOString() },
    ];

    return { checks };
  });

  // POST /api/admin/truth-checks/:id/approve - Approve truth check
  app.post('/api/admin/truth-checks/:id/approve', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const { id } = req.params as { id: string };
    console.log(`[AUDIT] Admin ${admin.fid} approved truth check ${id}`);

    return { success: true };
  });

  // GET /api/admin/trends - Trend approvals
  app.get('/api/admin/trends', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const trends = [
      { id: 'trend_1', title: 'LayerZero Airdrop Season 2', category: 'airdrop', status: 'pending', mentions: 8921, velocity: 234, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'trend_2', title: 'Ethereum Foundation Grant', category: 'grant', status: 'approved', mentions: 1923, velocity: 89, createdAt: new Date(Date.now() - 14400000).toISOString() },
    ];

    return { trends };
  });

  // POST /api/admin/trends/:id/approve - Approve trend
  app.post('/api/admin/trends/:id/approve', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const { id } = req.params as { id: string };
    console.log(`[AUDIT] Admin ${admin.fid} approved trend ${id}`);

    return { success: true };
  });

  // GET /api/admin/alert-logs - Alert delivery logs
  app.get('/api/admin/alert-logs', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const logs = [
      { id: 'log_1', alertId: 'alert_1', userFid: 12345, channel: 'miniapp', status: 'delivered', deliveredAt: new Date(Date.now() - 300000).toISOString() },
      { id: 'log_2', alertId: 'alert_2', userFid: 12345, channel: 'direct_cast', status: 'failed', error: 'RATE_LIMITED', deliveredAt: new Date(Date.now() - 600000).toISOString() },
      { id: 'log_3', alertId: 'alert_3', userFid: 67890, channel: 'miniapp', status: 'delivered', deliveredAt: new Date(Date.now() - 900000).toISOString() },
    ];

    return { logs };
  });
}

// ─── Technical Debt Routes ─────────────────────────────────────────────────────

export async function adminDebtRoutes(app: FastifyInstance) {

  // GET /api/admin/debt - Technical debt board
  app.get('/api/admin/debt', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const debt = [
      { id: 'td_1', title: 'Migrate from REST to GraphQL', priority: 'high', category: 'api', estimatedHours: 40, createdAt: '2026-04-01' },
      { id: 'td_2', title: 'Add comprehensive error handling', priority: 'medium', category: 'backend', estimatedHours: 24, createdAt: '2026-04-15' },
      { id: 'td_3', title: 'Implement proper caching layer', priority: 'medium', category: 'performance', estimatedHours: 16, createdAt: '2026-04-20' },
      { id: 'td_4', title: 'Add unit tests for core agents', priority: 'high', category: 'testing', estimatedHours: 32, createdAt: '2026-05-01' },
    ];

    return { debt };
  });

  // POST /api/admin/debt - Add debt item
  app.post('/api/admin/debt', async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;

    const bodySchema = z.object({
      title: z.string().min(1).max(200),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      category: z.string(),
      estimatedHours: z.number().positive(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const id = `td_${Date.now()}`;
    console.log(`[AUDIT] Admin ${admin.fid} added debt item: ${id}`);

    return { id, ...parsed.data };
  });
}

// ─── Demo Routes ─────────────────────────────────────────────────────────────

export async function adminDemoRoutes(app: FastifyInstance) {

  // POST /api/admin/demo/seed - Seed demo data
  app.post('/api/admin/demo/seed', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    // Demo seeding is handled by scripts/demo-seed.mjs
    // This endpoint is a placeholder for API-based seeding
    console.log('[DEMO] Seeding demo data...');

    return { success: true, message: 'Demo data seeded. Use scripts/demo-seed.mjs for full seeding.' };
  });

  // POST /api/admin/demo/run-scenario - Run a specific demo scenario
  app.post('/api/admin/demo/run-scenario', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    const bodySchema = z.object({
      scenario: z.number().min(1).max(6),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid scenario', details: parsed.error.errors });
    }

    const { scenario } = parsed.data;
    console.log(`[DEMO] Running scenario ${scenario}...`);

    const results = {
      1: { success: true, scenario: 'mention_summary', message: 'Summary generated' },
      2: { success: true, scenario: 'truth_check', message: 'Token claim: uncertain/high-risk' },
      3: { success: true, scenario: 'radar_trend', message: '$GRASS trend approved, alert sent' },
      4: { success: true, scenario: 'scam_warning', message: 'Critical phishing campaign detected' },
      5: { success: true, scenario: 'composer', message: 'Weak cast improved, draft saved' },
      6: { success: true, scenario: 'plan_limit', message: 'Free user blocked at 5/5 limit' },
    };

    return results[scenario as keyof typeof results] || { success: false, message: 'Unknown scenario' };
  });

  // POST /api/admin/demo/reset - Reset demo data
  app.post('/api/admin/demo/reset', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    console.log('[DEMO] Resetting demo data...');

    return { success: true, message: 'Demo data cleared. Use scripts/demo-reset.mjs for full reset.' };
  });

  // GET /api/admin/demo/status - Get demo status
  app.get('/api/admin/demo/status', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);

    return {
      demoUsersSeeded: true,
      demoScenarios: [
        { id: 1, name: 'Basic Mention Summary', status: 'ready' },
        { id: 2, name: 'Truth Check', status: 'ready' },
        { id: 3, name: 'Radar Trend Detection', status: 'ready' },
        { id: 4, name: 'Scam Warning', status: 'ready' },
        { id: 5, name: 'Composer Draft', status: 'ready' },
        { id: 6, name: 'Plan Limit', status: 'ready' },
      ],
    };
  });
}

// ─── Mock Far caster Routes ──────────────────────────────────────────────────────

export async function adminMockFarcasterRoutes(app: FastifyInstance) {

  // POST /api/admin/mock/farcaster/mention - Inject mock mention event
  app.post('/api/admin/mock/farcaster/mention', async (req: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Not available in production' });
    }

    const bodySchema = z.object({
      fid: z.number().optional(),
      username: z.string().optional(),
      text: z.string().optional(),
      parentHash: z.string().optional(),
      channelId: z.string().optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const mention = {
      type: 'mention',
      fid: parsed.data.fid ?? 1,
      username: parsed.data.username ?? 'alice',
      text: parsed.data.text ?? 'Hey @pulo_bot, what do you think about this airdrop?',
      parentHash: parsed.data.parentHash ?? 'mock-cast-001',
      channelId: parsed.data.channelId ?? null,
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Mock mention event injected',
      event: mention,
      note: 'Route to process this event: POST /api/webhook/farcaster (internal pipeline)',
    };
  });

  // POST /api/admin/mock/farcaster/thread - Get mock cast thread
  app.post('/api/admin/mock/farcaster/thread', async (req: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Not available in production' });
    }

    const bodySchema = z.object({
      castHash: z.string().optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const hash = parsed.data.castHash ?? 'mock-cast-001';

    // Return mock thread data for the given cast hash
    const thread = {
      rootCast: {
        hash,
        text: 'Just claimed my $DEGEN airdrop!',
        authorFid: 1,
        authorUsername: 'alice',
        authorDisplayName: 'Alice Chen',
        parentHash: null,
        rootParentHash: null,
        channelId: null,
        timestamp: new Date(Date.now() - 60_000).toISOString(),
        repliesCount: 2,
        recastsCount: 12,
        reactionsCount: 45,
      },
      replies: [
        {
          hash: 'mock-cast-002',
          text: 'Is it true that Ethereum is switching to proof-of-stake?',
          authorFid: 2,
          authorUsername: 'bob',
          authorDisplayName: 'Bob Martinez',
          parentHash: hash,
          rootParentHash: hash,
          channelId: null,
          timestamp: new Date(Date.now() - 30_000).toISOString(),
          repliesCount: 0,
          recastsCount: 0,
          reactionsCount: 5,
        },
      ],
      participants: [1, 2],
      castHashes: [hash, 'mock-cast-002'],
    };

    return { success: true, thread };
  });

  // POST /api/admin/mock/farcaster/reply - Test reply through pipeline
  app.post('/api/admin/mock/farcaster/reply', async (req: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Not available in production' });
    }

    const bodySchema = z.object({
      parentHash: z.string().optional(),
      text: z.string().optional(),
      simulateRateLimit: z.boolean().optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { simulateRateLimit } = parsed.data;

    if (simulateRateLimit) {
      return reply.status(429).send({
        error: 'FARCASTER_RATE_LIMITED',
        message: 'Rate limited by Neynar',
        code: 'FARCASTER_RATE_LIMITED',
        retryable: true,
      });
    }

    const parentHash = parsed.data.parentHash ?? 'mock-cast-001';
    const text = parsed.data.text ?? 'Thanks for sharing! DYOR and be careful of scams.';

    const mockResult = {
      hash: `mock-reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: `https://warpcast.com/pulo_bot/mock-reply-${Date.now()}`,
    };

    return {
      success: true,
      message: 'Mock reply published (no actual Far caster call)',
      result: mockResult,
      parentHash,
      text,
    };
  });

  // GET /api/admin/mock/farcaster/state - Get mock provider state
  app.get('/api/admin/mock/farcaster/state', async (req: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Not available in production' });
    }

    const { getMockRateLimitConfig, resetMockRateLimit, setMockRateLimit } = await import('@pulo/farcaster');

    return {
      rateLimit: getMockRateLimitConfig(),
      note: 'Use POST /api/admin/mock/farcaster/rate-limit to configure',
    };
  });

  // POST /api/admin/mock/farcaster/rate-limit - Configure mock rate limiting
  app.post('/api/admin/mock/farcaster/rate-limit', async (req: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Not available in production' });
    }

    const bodySchema = z.object({
      enabled: z.boolean(),
      castsUntilRateLimit: z.number().min(1).max(100).optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { setMockRateLimit } = await import('@pulo/farcaster');
    setMockRateLimit(parsed.data.enabled, parsed.data.castsUntilRateLimit ?? 5);

    return {
      success: true,
      message: `Mock rate limiting ${parsed.data.enabled ? 'enabled' : 'disabled'}`,
      castsUntilRateLimit: parsed.data.castsUntilRateLimit ?? 5,
    };
  });

  // POST /api/admin/mock/farcaster/clear - Clear mock write history
  app.post('/api/admin/mock/farcaster/clear', async (req: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Not available in production' });
    }

    const { resetMockRateLimit } = await import('@pulo/farcaster');
    resetMockRateLimit();

    return { success: true, message: 'Mock state cleared' };
  });
}