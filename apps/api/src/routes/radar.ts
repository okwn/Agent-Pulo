// apps/api/src/routes/radar.ts — Radar trend API routes

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDB } from '@pulo/db';
import { radarTrendRepository } from '@pulo/db';
import { radarScan } from '@pulo/radar';
import { createChildLogger } from '@pulo/observability';
import { getProvider } from '@pulo/farcaster';

const log = createChildLogger('radar-routes');

// ─── Request Schemas ───────────────────────────────────────────────────────────

const ScanRequestSchema = z.object({
  channels: z.array(z.string()).optional(),
  minScore: z.number().optional(),
});

type ScanRequest = z.infer<typeof ScanRequestSchema>;

// ─── Response Schemas ───────────────────────────────────────────────────────────

const RadarTrendSchema = z.object({
  id: z.string(),
  title: z.string(),
  normalizedTitle: z.string().nullable(),
  category: z.string(),
  keywords: z.array(z.string()),
  score: z.number(),
  velocity: z.number(),
  riskLevel: z.string(),
  confidence: z.number(),
  adminStatus: z.string(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  sourceCount: z.number(),
  castCount: z.number(),
  trustedAuthorCount: z.number(),
  summary: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

type RadarTrendResponse = z.infer<typeof RadarTrendSchema>;

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function radarRoutes(fastify: FastifyInstance) {

  // GET /api/radar/trends — list active trends (user-facing)
  fastify.get('/api/radar/trends', async (request, reply) => {
    const { limit = '50', category, status, minScore } = request.query as Record<string, string>;

    const db = getDB();
    let trends = await radarTrendRepository.activeTrends(db, Math.min(parseInt(limit, 10), 100));

    if (category) {
      trends = trends.filter(t => t.category === category);
    }
    if (status) {
      trends = trends.filter(t => t.adminStatus === status);
    }
    if (minScore) {
      const min = parseInt(minScore, 10);
      trends = trends.filter(t => (t.score ?? 0) >= min);
    }

    return reply.send({
      data: trends.map(t => formatTrend(t)),
      total: trends.length,
    });
  });

  // GET /api/radar/trends/:id — get specific trend
  fastify.get<{ Params: { id: string } }>('/api/radar/trends/:id', async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.status(400).send({ error: 'Missing trend ID' });
    }

    const db = getDB();
    const trend = await radarTrendRepository.findById(db, id);

    if (!trend) {
      return reply.status(404).send({ error: 'Trend not found' });
    }

    const sources = await radarTrendRepository.getSources(db, id);

    return reply.send({
      ...formatTrend(trend),
      sources: sources.map(s => ({
        castHash: s.castHash,
        authorFid: s.authorFid,
        authorUsername: s.authorUsername,
        text: s.text,
        engagementScore: s.engagementScore,
        trustScore: s.trustScore,
        hasSuspiciousLink: s.hasSuspiciousLink,
        hasClaimRisk: s.hasClaimRisk,
        createdAt: s.createdAt,
      })),
    });
  });

  // POST /api/admin/radar/scan — trigger a radar scan (admin only)
  fastify.post('/api/admin/radar/scan', async (request, reply) => {
    const parseResult = ScanRequestSchema.safeParse(request.body ?? {});
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request',
        details: parseResult.error.flatten(),
      });
    }

    const { channels, minScore } = parseResult.data;

    log.info({ channels, minScore }, 'Admin radar scan triggered');

    // Run scan
    const scan = new (await import('@pulo/radar')).RadarScan({
      channels,
      minScore,
      provider: getProvider(),
      db: getDB(),
    });

    const result = await scan.run();

    log.info(result, 'Radar scan complete');

    return reply.send({
      status: 'completed',
      ...result,
      timestamp: new Date().toISOString(),
    });
  });

  // POST /api/admin/radar/trends/:id/approve — approve a trend
  fastify.post<{ Params: { id: string } }>('/api/admin/radar/trends/:id/approve', async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.status(400).send({ error: 'Missing trend ID' });
    }

    const db = getDB();
    const trend = await radarTrendRepository.findById(db, id);

    if (!trend) {
      return reply.status(404).send({ error: 'Trend not found' });
    }

    const updated = await radarTrendRepository.setStatus(db, id, 'approved');

    log.info({ trendId: id }, 'Trend approved by admin');

    return reply.send({ success: true, trend: formatTrend(updated) });
  });

  // POST /api/admin/radar/trends/:id/reject — reject a trend
  fastify.post<{ Params: { id: string } }>('/api/admin/radar/trends/:id/reject', async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.status(400).send({ error: 'Missing trend ID' });
    }

    const db = getDB();
    const trend = await radarTrendRepository.findById(db, id);

    if (!trend) {
      return reply.status(404).send({ error: 'Trend not found' });
    }

    const updated = await radarTrendRepository.setStatus(db, id, 'rejected');

    log.info({ trendId: id }, 'Trend rejected by admin');

    return reply.send({ success: true, trend: formatTrend(updated) });
  });

  // POST /api/admin/radar/trends/:id/alert — mark trend as alerted
  fastify.post<{ Params: { id: string } }>('/api/admin/radar/trends/:id/alert', async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.status(400).send({ error: 'Missing trend ID' });
    }

    const db = getDB();
    const trend = await radarTrendRepository.findById(db, id);

    if (!trend) {
      return reply.status(404).send({ error: 'Trend not found' });
    }

    const updated = await radarTrendRepository.setStatus(db, id, 'alerted');

    log.info({ trendId: id }, 'Trend marked as alerted');

    return reply.send({ success: true, trend: formatTrend(updated) });
  });

  // GET /api/admin/radar/trends — list all trends with admin status
  fastify.get('/api/admin/radar/trends', async (request, reply) => {
    const { limit = '50', offset = '0', status, category } = request.query as Record<string, string>;

    const db = getDB();
    const allTrends = status
      ? await radarTrendRepository.findByStatus(db, status as 'detected' | 'watching' | 'approved' | 'rejected' | 'alerted' | 'archived', 100)
      : await radarTrendRepository.recent(db, 100);

    let filtered = category
      ? allTrends.filter(t => t.category === category)
      : allTrends;

    const total = filtered.length;
    const off = parseInt(offset, 10);
    filtered = filtered.slice(off, off + parseInt(limit, 10));

    return reply.send({
      data: filtered.map(t => formatTrend(t)),
      total,
      limit: parseInt(limit, 10),
      offset: off,
    });
  });
}

function formatTrend(t: {
  id: string;
  title: string;
  normalizedTitle: string | null;
  category: string | null;
  keywords: string[] | null;
  score: number | null;
  velocity: number | null;
  riskLevel: string | null;
  confidence: number | null;
  adminStatus: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  sourceCount: number | null;
  castCount: number | null;
  trustedAuthorCount: number | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
}) {
  return {
    id: t.id,
    title: t.title,
    normalizedTitle: t.normalizedTitle ?? null,
    category: t.category ?? 'unknown',
    keywords: t.keywords ?? [],
    score: t.score ?? 0,
    velocity: t.velocity ?? 0,
    riskLevel: t.riskLevel ?? 'unknown',
    confidence: t.confidence ?? 0,
    adminStatus: (t.adminStatus ?? 'detected') as 'detected' | 'watching' | 'approved' | 'rejected' | 'alerted' | 'archived',
    firstSeenAt: t.firstSeenAt instanceof Date ? t.firstSeenAt.toISOString() : String(t.firstSeenAt ?? ''),
    lastSeenAt: t.lastSeenAt instanceof Date ? t.lastSeenAt.toISOString() : String(t.lastSeenAt ?? ''),
    sourceCount: t.sourceCount ?? 0,
    castCount: t.castCount ?? 0,
    trustedAuthorCount: t.trustedAuthorCount ?? 0,
    summary: t.summary ?? null,
    metadata: t.metadata ?? {},
  };
}