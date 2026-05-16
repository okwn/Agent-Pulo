// Billing routes — GET /api/billing/*, POST /api/admin/subscriptions/sync

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createSubscriptionProvider,
  PlanTier,
  PLAN_ENTITLEMENTS,
  getPlanDisplayName,
  type SubscriptionInfo,
  type UsageInfo,
} from '@pulo/billing';
import { DEMO_COOKIE, verifyDemoSessionToken } from '@pulo/auth';
import { userRepository, getDB } from '@pulo/db';

export async function billingRoutes(app: FastifyInstance) {
  const provider = createSubscriptionProvider();

  // Helper to get user from cookie
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
    return userRepository.findByFid(getDB(), payload.fid);
  }

  // GET /api/billing/plan - Get current user's plan info
  app.get('/api/billing/plan', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    let subInfo: SubscriptionInfo | null = null;
    try {
      subInfo = await provider.getSubscription(user.id);
    } catch {
      // Provider not available, use mock default
    }

    const plan = subInfo?.plan ?? PlanTier.FREE;
    const entitlements = PLAN_ENTITLEMENTS[plan];

    return {
      plan: {
        tier: plan,
        name: getPlanDisplayName(plan),
        status: subInfo?.status ?? 'active',
        expiresAt: subInfo?.expiresAt ?? null,
      },
      entitlements: {
        dailyTruthChecks: entitlements.dailyTruthChecks,
        monthlyTruthChecks: entitlements.monthlyTruthChecks,
        radarInboxSize: entitlements.radarInboxSize,
        radarAlertsEnabled: entitlements.radarAlertsEnabled,
        directCastAlerts: entitlements.directCastAlerts,
        miniAppNotifications: entitlements.miniAppNotifications,
        weeklyDigest: entitlements.weeklyDigest,
        autoDraftEnabled: entitlements.autoDraftEnabled,
        voiceProfileEnabled: entitlements.voiceProfileEnabled,
        composerEnabled: entitlements.composerEnabled,
      },
    };
  });

  // GET /api/billing/usage - Get current user's usage
  app.get('/api/billing/usage', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    let usage: UsageInfo | null = null;
    try {
      usage = await provider.getUsage(user.id);
    } catch {
      // Provider not available, return mock
    }

    if (!usage) {
      usage = {
        castsUsed: 0,
        castsLimit: 100,
        truthChecksUsed: 0,
        truthChecksLimit: 50,
        trendsTracked: 0,
        trendsLimit: 50,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    return usage;
  });

  // POST /api/admin/subscriptions/sync - Sync all subscriptions with provider
  app.post('/api/admin/subscriptions/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user || user.id !== 1) { // Simple admin check
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Get all users
    const users = await userRepository.findAll(getDB(), 1000);

    let synced = 0;
    let failed = 0;

    for (const u of users) {
      try {
        await provider.getSubscription(u.id);
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed, total: users.length };
  });
}

// Admin routes for user plan management
export async function adminBillingRoutes(app: FastifyInstance) {
  const provider = createSubscriptionProvider();

  // Helper to check admin
  async function isAdmin(req: FastifyRequest): Promise<boolean> {
    const cookieHeader = req.headers.cookie ?? '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );
    const token = cookies[DEMO_COOKIE];
    if (!token) return false;
    const payload = verifyDemoSessionToken(token);
    if (!payload) return false;
    const user = await userRepository.findByFid(getDB(), payload.fid);
    return user?.id === 1; // FID 1 is admin in demo mode
  }

  // POST /api/admin/users/:id/set-plan - Set user's plan (admin only)
  app.post('/api/admin/users/:id/set-plan', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!await isAdmin(req)) {
      // Log the unauthorized attempt
      console.warn('Unauthorized plan change attempt');
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { id } = req.params as { id: string };
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return reply.status(400).send({ error: 'Invalid user ID' });
    }

    const body = req.body as { plan?: string };
    const planSchema = z.enum(['free', 'pro', 'creator', 'community', 'admin']);
    const parsed = planSchema.safeParse(body.plan);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid plan', details: parsed.error.errors });
    }

    const plan = parsed.data as PlanTier;

    try {
      await provider.setPlan(userId, plan);
      return { success: true, userId, plan };
    } catch (error) {
      console.error('Failed to set plan:', error);
      return reply.status(500).send({ error: 'Failed to update plan' });
    }
  });
}
