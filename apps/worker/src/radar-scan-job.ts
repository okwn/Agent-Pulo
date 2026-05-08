// worker/src/radar-scan-job.ts — Scheduled radar scan worker job

import { Worker, Queue } from 'bullmq';
import { createChildLogger } from '@pulo/observability';
import { validateEnv } from '@pulo/shared';
import { getDB, radarKeywordRepository, radarChannelRepository } from '@pulo/db';
import { getProvider } from '@pulo/farcaster';
import { RadarScan, DEFAULT_WATCHED_CHANNELS, DEFAULT_KEYWORDS } from '@pulo/radar';

const logger = createChildLogger('radar-scan-job');
const env = validateEnv();

// Radar scan queue
const radarQueue = new Queue('radar-scan', {
  connection: {
    host: (env.REDIS_URL ?? 'redis://localhost:6388').replace('redis://', '').split(':')[0] || 'localhost',
    port: parseInt(process.env.PULO_REDIS_PORT ?? '6388', 10),
  },
});

/**
 * Enqueue a radar scan job.
 */
export async function enqueueRadarScan(channels?: string[], minScore?: number): Promise<string> {
  const job = await radarQueue.add('scan', { channels, minScore }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  logger.info({ jobId: job.id }, 'Radar scan job enqueued');
  return job.id!;
}

/**
 * Scheduled scan: runs every 15 minutes.
 * Also seeds default keywords and channels on first run.
 */
export async function runScheduledScan(): Promise<void> {
  const db = getDB();

  // Seed default keywords if empty
  try {
    for (const kw of DEFAULT_KEYWORDS.en) {
      await radarKeywordRepository.upsertKeyword(db, kw, 'unknown', 'en');
    }
    for (const kw of DEFAULT_KEYWORDS.tr) {
      await radarKeywordRepository.upsertKeyword(db, kw, 'unknown', 'tr');
    }
    for (const ch of DEFAULT_WATCHED_CHANNELS) {
      await radarChannelRepository.upsertChannel(db, ch.channelId, ch.name);
    }
    logger.debug('Default keywords and channels seeded');
  } catch (err) {
    logger.debug({ err }, 'Seed skipped (already exists or no DB)');
  }

  // Run scan
  const scan = new RadarScan({
    provider: getProvider(),
    db,
    channels: DEFAULT_WATCHED_CHANNELS.map(c => c.channelId),
  });

  const result = await scan.run();
  logger.info(result, 'Scheduled radar scan complete');
}

// Worker processor
export function startRadarWorker(): Worker {
  const worker = new Worker('radar-scan', async (job) => {
    const { channels, minScore } = job.data as { channels?: string[]; minScore?: number };

    logger.info({ jobId: job.id, channels, minScore }, 'Processing radar scan job');

    const db = getDB();
    const scan = new RadarScan({
      provider: getProvider(),
      db,
      channels: channels ?? DEFAULT_WATCHED_CHANNELS.map(c => c.channelId),
      minScore,
    });

    const result = await scan.run();
    logger.info({ jobId: job.id, result }, 'Radar scan job complete');
    return result;
  }, {
    connection: {
      host: (env.REDIS_URL ?? 'redis://localhost:6388').replace('redis://', '').split(':')[0] || 'localhost',
      port: parseInt(process.env.PULO_REDIS_PORT ?? '6388', 10),
    },
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Radar scan job failed');
  });

  logger.info('Radar scan worker started');
  return worker;
}

// Schedule: enqueue scan every 15 minutes
export function scheduleRadarScans(): void {
  setInterval(async () => {
    try {
      await enqueueRadarScan();
    } catch (err) {
      logger.error({ err }, 'Failed to enqueue scheduled radar scan');
    }
  }, 15 * 60 * 1000);

  logger.info('Radar scan scheduler initialized (every 15 min)');
}