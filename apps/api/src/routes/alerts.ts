// apps/api/src/routes/alerts.ts — Alert and notification settings API routes

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDB, alertRepository, preferencesRepository } from '@pulo/db';
import { alertTemplateRenderer, deliveryPlanner, type Alert } from '@pulo/notifications';
import { createChildLogger } from '@pulo/observability';
import { getProvider } from '@pulo/farcaster';

const log = createChildLogger('alert-routes');

const AlertQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  unreadOnly: z.string().optional(),
});

const UpdateSettingsSchema = z.object({
  allowedTopics: z.array(z.string()).optional(),
  blockedTopics: z.array(z.string()).optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
  notificationFrequency: z.enum(['realtime', 'digest', 'minimal']).optional(),
  dailyAlertLimit: z.number().min(1).max(200).optional(),
  allowMiniAppNotifications: z.boolean().optional(),
  allowDirectCasts: z.boolean().optional(),
});

type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;

export async function alertRoutes(fastify: FastifyInstance) {

  // GET /api/alerts — list user's alerts
  fastify.get('/api/alerts', async (request, reply) => {
    const { limit = '50', offset = '0', unreadOnly } = (request.query as Record<string, string>) ?? {};

    const fid = (request as { user?: { fid: number } }).user?.fid;
    if (!fid) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDB();
    const alerts = await alertRepository.findByUser(db, fid, Math.min(parseInt(limit, 10), 100));

    const filtered = unreadOnly === 'true'
      ? alerts.filter(a => !a.readAt)
      : alerts;

    return reply.send({
      data: filtered,
      total: filtered.length,
    });
  });

  // POST /api/alerts/:id/read — mark alert as read
  fastify.post<{ Params: { id: string } }>('/api/alerts/:id/read', async (request, reply) => {
    const { id } = request.params;
    if (!id) return reply.status(400).send({ error: 'Missing alert ID' });

    const db = getDB();
    await alertRepository.markRead(db, id);
    return reply.send({ success: true });
  });

  // GET /api/settings/alerts — get user's alert preferences
  fastify.get('/api/settings/alerts', async (request, reply) => {
    const fid = (request as { user?: { fid: number } }).user?.fid;
    if (!fid) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDB();
    const prefs = await preferencesRepository.findByFid(db, fid);
    if (!prefs) return reply.send({ data: null });

    return reply.send({
      data: {
        allowedTopics: prefs.allowedTopics,
        blockedTopics: prefs.blockedTopics,
        riskTolerance: prefs.riskTolerance,
        notificationFrequency: prefs.notificationFrequency,
        dailyAlertLimit: prefs.dailyAlertLimit,
        allowMiniAppNotifications: prefs.allowMiniAppNotifications,
        allowDirectCasts: prefs.allowDirectCasts,
      },
    });
  });

  // PATCH /api/settings/alerts — update user's alert preferences
  fastify.patch('/api/settings/alerts', async (request, reply) => {
    const parseResult = UpdateSettingsSchema.safeParse(request.body ?? {});
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid settings', details: parseResult.error.flatten() });
    }

    const fid = (request as { user?: { fid: number } }).user?.fid;
    if (!fid) return reply.status(401).send({ error: 'Unauthorized' });

    const db = getDB();
    const existing = await preferencesRepository.findByFid(db, fid);

    if (!existing) {
      return reply.status(404).send({ error: 'Preferences not found' });
    }

    const updated = await preferencesRepository.updatePreferences(db, existing.id, parseResult.data as UpdateSettings);
    log.info({ fid }, 'Alert preferences updated');

    return reply.send({
      data: {
        allowedTopics: updated.allowedTopics,
        blockedTopics: updated.blockedTopics,
        riskTolerance: updated.riskTolerance,
        notificationFrequency: updated.notificationFrequency,
        dailyAlertLimit: updated.dailyAlertLimit,
        allowMiniAppNotifications: updated.allowMiniAppNotifications,
        allowDirectCasts: updated.allowDirectCasts,
      },
    });
  });

  // POST /api/admin/alerts/test — send a test alert (admin only, mock mode)
  fastify.post('/api/admin/alerts/test', async (request, reply) => {
    const body = request.body as Record<string, unknown> ?? {};
    const targetFid = body.fid as number | undefined;
    const alertType = (body.type as string) ?? 'admin_message';

    const provider = getProvider();
    if (provider.mode !== 'mock') {
      return reply.status(403).send({ error: 'Test alerts only available in mock mode' });
    }

    if (!targetFid) {
      return reply.status(400).send({ error: 'Missing target fid' });
    }

    const db = getDB();
    const alert: Alert = {
      id: crypto.randomUUID(),
      userId: targetFid,
      type: (alertType as Alert['type']) ?? 'admin_message',
      title: 'Test Alert',
      body: 'This is a test alert from Pulo admin.',
      metadata: {},
      createdAt: new Date(),
    };

    await alertRepository.create(db, {
      userId: alert.userId,
      type: alert.type,
      title: alert.title,
      body: alert.body,
      metadata: alert.metadata,
    });

    // Deliver via delivery planner
    const prefs = await preferencesRepository.findByFid(db, targetFid);
    if (prefs) {
      const plan = await deliveryPlanner.plan({
        alert,
        userPrefs: {
          userId: targetFid,
          riskTolerance: prefs.riskTolerance ?? 'medium',
          notificationFrequency: prefs.notificationFrequency ?? 'realtime',
          allowMiniAppNotifications: prefs.allowMiniAppNotifications ?? true,
          allowDirectCasts: prefs.allowDirectCasts ?? false,
          allowedTopics: prefs.allowedTopics ?? [],
          blockedTopics: prefs.blockedTopics ?? [],
          preferredChannels: [],
          autoReplyMode: 'off',
          dailyAlertLimit: prefs.dailyAlertLimit ?? 50,
          dailyReplyLimit: 10,
          updatedAt: new Date(),
        },
        subscription: null,
      }, 0);
      await deliveryPlanner.deliver(plan.plans);
    }

    log.info({ targetFid, alertType }, 'Test alert sent');
    return reply.send({ success: true, alertId: alert.id });
  });
}
