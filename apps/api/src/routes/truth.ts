// apps/api/src/routes/truth.ts — Truth check API routes

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDB, schema } from '@pulo/db';
import { truthCheckRepository } from '@pulo/db';
import { TruthChecker, truthIntentDetector } from '@pulo/truth';
import { createChildLogger } from '@pulo/observability';
import { getProvider } from '@pulo/farcaster';
import { SafetyGate, defaultConsents } from '@pulo/safety';

const log = createChildLogger('truth-routes');

const { truthChecks } = schema;

// ─── Request Schemas ────────────────────────────────────────────────────────────

const CheckRequestSchema = z.object({
  targetCastHash: z.string().min(1),
  targetCastText: z.string().min(1),
  targetAuthorFid: z.number().int().optional().default(0),
  userId: z.number().int().optional().default(0),
  userPlan: z.enum(['free', 'pro', 'creator', 'admin']).optional().default('free'),
  fid: z.number().int().optional(),
});

type CheckRequest = z.infer<typeof CheckRequestSchema>;

const DetectIntentRequestSchema = z.object({
  text: z.string().min(1),
});

type DetectIntentRequest = z.infer<typeof DetectIntentRequestSchema>;

// ─── Response Schemas ──────────────────────────────────────────────────────────

const EvidenceItemSchema = z.object({
  castHash: z.string(),
  authorFid: z.number(),
  authorUsername: z.string().optional(),
  text: z.string(),
  sentiment: z.enum(['supporting', 'contradicting', 'neutral', 'suspicious']).optional(),
  isOfficialSource: z.boolean().optional(),
  isHighTrustUser: z.boolean().optional(),
  timestamp: z.string().optional(),
});

const RiskFlagSchema = z.object({
  type: z.enum(['scam', 'phishing', 'spam', 'engagement_bait', 'misinformation', 'manipulation']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  castHash: z.string().optional(),
});

const TruthReportSchema = z.object({
  id: z.string().optional(),
  targetCastHash: z.string(),
  targetCastText: z.string(),
  targetAuthorFid: z.number(),
  verdict: z.enum(['likely_true', 'likely_false', 'mixed', 'unverified', 'scam_risk', 'insufficient_context']),
  confidence: z.number(),
  shortAnswer: z.string(),
  dashboardExplanation: z.string(),
  evidenceSummary: z.object({
    supporting_casts: z.array(EvidenceItemSchema),
    contradicting_casts: z.array(EvidenceItemSchema),
    official_sources: z.array(EvidenceItemSchema),
    high_trust_users: z.array(EvidenceItemSchema),
    suspicious_patterns: z.array(EvidenceItemSchema),
    missing_evidence: z.array(z.string()),
  }),
  riskAssessment: z.object({
    overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
    flags: z.array(RiskFlagSchema),
    summary: z.string(),
    score: z.number(),
  }),
  recommendedAction: z.enum(['safe_to_share', 'verify_first', 'do_not_share', 'report', 'cannot_determine']),
  publicReplyText: z.string(),
  sourceCasts: z.array(z.string()),
  sourcesChecked: z.array(z.string()),
  processingTimeMs: z.number().optional(),
  createdAt: z.string(),
});

type TruthReportResponse = z.infer<typeof TruthReportSchema>;

// ─── Routes ───────────────────────────────────────────────────────────────────

const truthChecker = new TruthChecker({ farcasterProvider: getProvider() });

export async function truthRoutes(fastify: FastifyInstance) {

  // POST /api/truth/check — run a truth check on a target cast
  fastify.post('/api/truth/check', async (request, reply) => {
    const parseResult = CheckRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request',
        details: parseResult.error.flatten(),
      });
    }

    const { targetCastHash, targetCastText, targetAuthorFid, userId, userPlan, fid } = parseResult.data;

    log.info({ targetCastHash, userId }, 'Truth check requested');

    // Build minimal event context
    const event = {
      hash: targetCastHash,
      castText: targetCastText,
      authorFid: targetAuthorFid,
      fid: fid ?? targetAuthorFid,
    } as unknown as Parameters<typeof truthChecker.run>[0];

    // Create safety gate for this user
    const safetyGate = new SafetyGate({
      userId,
      plan: userPlan ?? 'free',
      consents: defaultConsents(),
    });

    // Run truth check (in try/catch so safety blocks don't crash)
    let report: TruthReportResponse;
    try {
      const result = await truthChecker.run(event, safetyGate);
      report = {
        targetCastHash: result.targetCastHash,
        targetCastText: result.targetCastText,
        targetAuthorFid: result.targetAuthorFid,
        verdict: result.verdict as TruthReportResponse['verdict'],
        confidence: result.confidence,
        shortAnswer: result.shortAnswer,
        dashboardExplanation: result.dashboardExplanation,
        evidenceSummary: result.evidence as TruthReportResponse['evidenceSummary'],
        riskAssessment: result.riskAssessment as TruthReportResponse['riskAssessment'],
        recommendedAction: result.recommendedAction,
        publicReplyText: result.publicReplyText,
        sourceCasts: result.sourceCasts,
        sourcesChecked: result.sourcesChecked,
        processingTimeMs: result.processingTimeMs,
        createdAt: result.createdAt,
      };
    } catch (err) {
      log.error({ err, targetCastHash }, 'Truth check failed');
      return reply.status(500).send({
        error: 'Truth check failed',
        message: String(err),
      });
    }

    // Persist to DB
    try {
      const db = getDB();
      const saved = await truthCheckRepository.create(db, {
        userId: userId ?? null,
        targetCastHash,
        claimText: targetCastText.slice(0, 500),
        verdict: report.verdict === 'likely_true' ? 'verified'
          : report.verdict === 'likely_false' ? 'debunked'
          : report.verdict === 'unverified' ? 'uncertain'
          : 'likely_true',
        confidence: Math.round(report.confidence * 100),
        evidenceSummary: report.shortAnswer,
        riskLevel: report.riskAssessment.overallRisk,
        sourceCastHashes: report.sourceCasts,
        status: 'completed',
      });
      report.id = saved.id;
    } catch (err) {
      log.warn({ err }, 'Failed to persist truth check to DB (non-fatal)');
    }

    return reply.send(report);
  });

  // GET /api/truth/:id — get a specific truth check by ID
  fastify.get<{ Params: { id: string } }>('/api/truth/:id', async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.status(400).send({ error: 'Missing truth check ID' });
    }

    const db = getDB();
    const truthCheck = await truthCheckRepository.findById(db, id);

    if (!truthCheck) {
      return reply.status(404).send({ error: 'Truth check not found' });
    }

    return reply.send({
      id: truthCheck.id,
      targetCastHash: truthCheck.targetCastHash,
      claimText: truthCheck.claimText,
      verdict: truthCheck.verdict,
      confidence: truthCheck.confidence,
      evidenceSummary: truthCheck.evidenceSummary,
      riskLevel: truthCheck.riskLevel,
      status: truthCheck.status,
      sourceCastHashes: truthCheck.sourceCastHashes,
      createdAt: truthCheck.createdAt,
    });
  });

  // GET /api/admin/truth-checks — list recent truth checks (admin)
  fastify.get('/api/admin/truth-checks', async (request, reply) => {
    const { limit = '50', offset = '0', verdict, riskLevel } = request.query as Record<string, string>;

    const db = getDB();
    let checks = await truthCheckRepository.recent(db, Math.min(parseInt(limit, 10), 100));

    // Apply filters if provided
    if (verdict) {
      checks = checks.filter(c => String(c.verdict) === verdict);
    }
    if (riskLevel) {
      checks = checks.filter(c => String(c.riskLevel) === riskLevel);
    }

    return reply.send({
      data: checks.slice(parseInt(offset, 10)),
      total: checks.length,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  });

  // POST /api/truth/detect-intent — detect if text contains truth check query
  fastify.post('/api/truth/detect-intent', async (request, reply) => {
    const parseResult = DetectIntentRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request',
        details: parseResult.error.flatten(),
      });
    }

    const { text } = parseResult.data;
    const intent = truthIntentDetector.detect(text);

    return reply.send({
      detected: intent.detected,
      queryLanguage: intent.queryLanguage,
      patterns: intent.patterns,
      confidence: intent.confidence,
    });
  });
}
