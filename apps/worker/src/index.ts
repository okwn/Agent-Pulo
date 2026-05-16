import { Worker } from 'bullmq';
import { createChildLogger } from '@pulo/observability';
import { validateEnv } from '@pulo/shared';
import { startRadarWorker, scheduleRadarScans } from './radar-scan-job.js';
import { startMentionWorker } from './mention-job.js';
import Fastify from 'fastify';

const logger = createChildLogger('worker');
const env = validateEnv();

// Start mention worker
try {
  startMentionWorker();
  logger.info('Mention subsystem initialized');
} catch (err) {
  logger.debug({ err }, 'Mention subsystem skipped (Redis not available)');
}

// Start radar scan worker and scheduler
try {
  startRadarWorker();
  scheduleRadarScans();
  logger.info('Radar subsystem initialized');
} catch (err) {
  logger.debug({ err }, 'Radar subsystem skipped (Redis not available)');
}

// Main BullMQ worker
const worker = new Worker('pulo-jobs', async (job) => {
  logger.info({ jobId: job.id, name: job.name }, 'Processing job');
  return { processed: true };
}, {
  connection: {
    host: (env.REDIS_URL ?? 'redis://localhost:6388').replace('redis://', '').split(':')[0] || 'localhost',
    port: parseInt(process.env.PULO_REDIS_PORT ?? '6388', 10),
  },
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job failed');
});

// HTTP health server — replaces raw TCP socket
const healthPort = parseInt(process.env.PULO_WORKER_PORT ?? '4312', 10);
const healthApp = Fastify({ logger: false });

healthApp.get('/health/live', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

healthApp.get('/health/ready', async (req, reply) => {
  const checks: { component: string; status: 'ok' | 'error'; latencyMs?: number; message?: string }[] = [];
  const redisStart = Date.now();
  try {
    const Redis = (await import('ioredis')).default;
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

healthApp.get('/', async () => ({ status: 'ok', service: 'pulo-worker' }));

healthApp.listen({ port: healthPort, host: '0.0.0.0' }, (err, addr) => {
  if (err) logger.error({ err }, 'Worker health server failed to start');
  else logger.info({ addr }, 'Worker health server listening');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await worker.close();
  await healthApp.close();
  process.exit(0);
});

logger.info({ env: env.NODE_ENV }, 'PULO Worker started');