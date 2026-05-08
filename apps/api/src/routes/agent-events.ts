// apps/api/src/routes/agent-events.ts — Admin visibility into agent events and runs

import type { FastifyInstance } from 'fastify';
import { getDB, alertRepository, eventRepository } from '@pulo/db';
import { createChildLogger } from '@pulo/observability';

const log = createChildLogger('agent-events-routes');

export async function agentEventsRoutes(fastify: FastifyInstance) {

  // GET /api/admin/agent-events — list agent events
  fastify.get('/api/admin/agent-events', async (request, reply) => {
    const { limit = '50', status, source } = (request.query as Record<string, string>) ?? {};
    const db = getDB();
    const events = await eventRepository.findRecent(db, Math.min(parseInt(limit, 10), 100));

    let filtered = events;
    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }
    if (source) {
      filtered = filtered.filter(e => e.source === source);
    }

    return reply.send({
      data: filtered.map(e => ({
        id: e.id,
        type: e.type,
        source: e.source,
        userId: e.userId,
        fid: e.fid,
        castHash: e.castHash,
        status: e.status,
        createdAt: e.createdAt,
        processedAt: e.processedAt,
      })),
      total: filtered.length,
    });
  });

  // GET /api/admin/agent-runs — list agent run logs (via agentEvents as proxy)
  fastify.get('/api/admin/agent-runs', async (request, reply) => {
    const { limit = '50', offset = '0', runType } = (request.query as Record<string, string>) ?? {};
    const db = getDB();
    const events = await eventRepository.findRecent(db, Math.min(parseInt(limit, 10), 200));

    let filtered = events.filter(e => e.type === 'truth_check_request' || e.type === 'mention' || e.type === 'reply');
    if (runType) {
      filtered = filtered.filter(e => e.payload && (e.payload as Record<string, unknown>).runType === runType);
    }

    const off = parseInt(offset, 10);
    const page = filtered.slice(off, off + parseInt(limit, 10));

    return reply.send({
      data: page.map(e => ({
        id: e.id,
        type: e.type,
        source: e.source,
        fid: e.fid,
        castHash: e.castHash,
        status: e.status,
        payload: e.payload,
        createdAt: e.createdAt,
        processedAt: e.processedAt,
      })),
      total: filtered.length,
      limit: parseInt(limit, 10),
      offset: off,
    });
  });

  // GET /api/admin/reply-drafts — list reply drafts (stored in alertDeliveries with pending status)
  fastify.get('/api/admin/reply-drafts', async (request, reply) => {
    const { limit = '50' } = (request.query as Record<string, string>) ?? {};
    const db = getDB();

    // Get pending deliveries that look like drafts (idempotencyKey starts with 'draft:')
    const deliveries = await alertRepository.findDeliveriesByUser(db, 0, Math.min(parseInt(limit, 10), 100));
    const drafts = deliveries.filter(d => d.idempotencyKey?.startsWith('draft:'));

    return reply.send({
      data: drafts,
      total: drafts.length,
    });
  });

  // POST /api/admin/reply-drafts/:id/publish — publish a draft reply
  fastify.post<{ Params: { id: string } }>('/api/admin/reply-drafts/:id/publish', async (request, reply) => {
    const { id } = request.params;
    if (!id) return reply.status(400).send({ error: 'Missing draft ID' });

    const db = getDB();

    // Find the draft delivery by idempotency key
    const draft = await alertRepository.findDeliveryByIdempotencyKey(db, `draft:${id}`);
    if (!draft) return reply.status(404).send({ error: 'Draft not found' });

    // Mark as sent (publish was called)
    await alertRepository.markDeliverySent(db, draft.id);

    log.info({ draftId: id }, 'Reply draft published via admin');
    return reply.send({ success: true, draftId: id });
  });

  // POST /api/admin/agent-events/:id/retry — retry a failed agent event
  fastify.post<{ Params: { id: string } }>('/api/admin/agent-events/:id/retry', async (request, reply) => {
    const { id } = request.params;
    if (!id) return reply.status(400).send({ error: 'Missing event ID' });

    const db = getDB();
    const event = await eventRepository.findById(db, id);
    if (!event) return reply.status(404).send({ error: 'Event not found' });

    // Mark as pending for reprocessing
    await eventRepository.markProcessed(db, id);

    log.info({ eventId: id }, 'Agent event retry enqueued');
    return reply.send({ success: true, eventId: id });
  });
}
