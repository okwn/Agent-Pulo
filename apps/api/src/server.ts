import Fastify from 'fastify';
import cors from '@fastify/cors';
import { validateEnv } from '@pulo/shared';
import { createChildLogger } from '@pulo/observability';
import { setMode } from '@pulo/farcaster';
import { applySecurityMiddleware, enforceProductionMode, getCorsOptions } from './middleware/security.js';
import { webhookRoutes } from './routes/webhook.js';
import { farcasterRoutes } from './routes/farcaster.js';
import { truthRoutes } from './routes/truth.js';
import { radarRoutes } from './routes/radar.js';
import { alertRoutes } from './routes/alerts.js';
import { agentEventsRoutes } from './routes/agent-events.js';
import { userRoutes } from './routes/user.js';
import { billingRoutes, adminBillingRoutes } from './routes/billing.js';
import { composerRoutes, draftRoutes } from './routes/composer.js';
import { adminErrorRoutes, adminJobRoutes, adminHealthRoutes, adminSystemRoutes, adminDebtRoutes, adminDemoRoutes, adminMockFarcasterRoutes } from './routes/admin.js';
import { observabilityRoutes } from './routes/observability.js';
import { getDB, pingDB } from '@pulo/db';
import Redis from 'ioredis';

const logger = createChildLogger('api');

// Enforce production mode checks BEFORE loading config
enforceProductionMode();

const env = validateEnv();

// Set farcaster mode from env
const farMode = (process.env.PULO_FARCASTER_MODE ?? 'mock') as 'mock' | 'live';
setMode(farMode);

const app = Fastify({ logger });

// Apply CORS with strict policy
await app.register(cors, getCorsOptions());

// Apply security middleware
await applySecurityMiddleware(app);

// Register routes
await app.register(webhookRoutes);
await app.register(farcasterRoutes);
await app.register(truthRoutes);
await app.register(radarRoutes);
await app.register(alertRoutes);
await app.register(agentEventsRoutes);
await app.register(userRoutes);
await app.register(billingRoutes);
await app.register(adminBillingRoutes);
await app.register(composerRoutes);
await app.register(draftRoutes);
await app.register(adminErrorRoutes);
await app.register(adminJobRoutes);
await app.register(adminHealthRoutes);
await app.register(adminSystemRoutes);
await app.register(adminDebtRoutes);
await app.register(adminDemoRoutes);
await app.register(adminMockFarcasterRoutes);
await app.register(observabilityRoutes);

app.get('/health', async () => ({
  status: 'ok',
  service: 'pulo-api',
  timestamp: new Date().toISOString(),
  env: env.NODE_ENV,
  mode: farMode,
}));

app.get('/health/ready', async (req, reply) => {
  const checks: { component: string; status: 'ok' | 'error'; latencyMs?: number; message?: string }[] = [];

  // DB check
  const dbStart = Date.now();
  try {
    const ok = await pingDB();
    checks.push({ component: 'database', status: ok ? 'ok' : 'error', latencyMs: Date.now() - dbStart });
  } catch (err) {
    checks.push({ component: 'database', status: 'error', latencyMs: Date.now() - dbStart, message: String(err) });
  }

  // Redis check
  const redisStart = Date.now();
  try {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6388';
    const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 1 });
    await redis.ping();
    await redis.quit();
    checks.push({ component: 'redis', status: 'ok', latencyMs: Date.now() - redisStart });
  } catch (err) {
    checks.push({ component: 'redis', status: 'error', latencyMs: Date.now() - redisStart, message: String(err) });
  }

  const allOk = checks.every(c => c.status === 'ok');
  return reply.status(allOk ? 200 : 503).send({
    status: allOk ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

app.get('/health/live', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

app.get('/', async () => ({ name: 'PULO API', version: '0.1.0' }));

const port = parseInt(process.env.PULo_API_PORT ?? '4311', 10);

app.listen({ port, host: '0.0.0.0' }, (err, addr) => {
  if (err) {
    logger.error({ err }, 'Server failed to start');
    process.exit(1);
  }
  logger.info({ addr, mode: farMode }, 'PULO API server listening');
});

export default app;