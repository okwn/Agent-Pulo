import { Worker, Queue } from 'bullmq';
import { createChildLogger } from '@pulo/observability';
import { validateEnv } from '@pulo/shared';
import { startRadarWorker, scheduleRadarScans } from './radar-scan-job.js';
import { startMentionWorker } from './mention-job.js';

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

const port = parseInt(process.env.PULo_WORKER_PORT ?? '4312', 10);
const { createServer } = await import('node:net');

const healthServer = createServer((socket) => {
  socket.write('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"status":"ok","service":"pulo-worker"}');
  socket.end();
});

healthServer.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'Worker health server listening');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await worker.close();
  healthServer.close();
  process.exit(0);
});

logger.info({ env: env.NODE_ENV }, 'PULO Worker started');