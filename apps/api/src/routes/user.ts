// User settings routes — GET/PATCH /api/me, /api/settings/*

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDB, schema, userRepository, preferencesRepository } from '@pulo/db';
import { z } from 'zod';
import { createAuthProvider, DEMO_COOKIE, createDemoSessionToken } from '@pulo/auth';

// Voice settings schema
const voiceSettingsSchema = z.object({
  language: z.string().min(2).max(5).default('en'),
  tone: z.enum(['balanced', 'formal', 'casual', 'witty']).default('balanced'),
  replyStyle: z.enum(['helpful', 'brief', 'detailed', 'persuasive']).default('helpful'),
  humorLevel: z.number().min(0).max(100).default(50),
  technicalDepth: z.number().min(0).max(100).default(50),
  conciseVsDetailed: z.number().min(0).max(100).default(50), // 0=concise, 100=detailed
  exampleCasts: z.array(z.string()).default([]),
});

// Alert settings schema
const alertSettingsSchema = z.object({
  allowedTopics: z.array(z.string()).default([]),
  blockedTopics: z.array(z.string()).default([]),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  frequency: z.enum(['realtime', 'digest', 'minimal']).default('realtime'),
  allowMiniAppNotifications: z.boolean().default(true),
  allowDirectCasts: z.boolean().default(false),
  dailyAlertLimit: z.number().min(1).max(1000).default(50),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

// Automation settings schema
const automationSettingsSchema = z.object({
  autoReplyMode: z.enum(['off', 'draft', 'publish']).default('off'),
  mentionOnlyMode: z.boolean().default(true),
  preferredChannels: z.array(z.string()).default([]),
});

// Combined settings schema
const settingsSchema = z.object({
  voice: voiceSettingsSchema.partial(),
  alerts: alertSettingsSchema.partial(),
  automation: automationSettingsSchema.partial(),
});

// Demo login schema
const demoLoginSchema = z.object({
  fid: z.number().int().positive(),
  username: z.string().min(1).max(50),
});

export async function userRoutes(app: FastifyInstance) {
  const db = getDB();

  // Get current user
  app.get('/api/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const cookieHeader = req.headers.cookie ?? '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );

    const token = cookies[DEMO_COOKIE];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    // Verify demo token
    const { createDemoSessionToken, verifyDemoSessionToken } = await import('@pulo/auth');
    const payload = verifyDemoSessionToken(token);
    if (!payload) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const user = await userRepository.findByFid(db, payload.fid);
    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }

    return {
      id: user.id,
      fid: user.fid,
      username: user.username,
      displayName: user.displayName,
      plan: user.plan,
      createdAt: user.createdAt,
    };
  });

  // Demo login — creates session for FID
  app.post('/api/auth/demo', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { fid?: number; username?: string };
    const parsed = demoLoginSchema.safeParse(body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { fid, username } = parsed.data;

    // Upsert user by FID
    let user = await userRepository.findByFid(db, fid);
    if (!user) {
      user = await userRepository.create(db, {
        fid,
        username,
        displayName: username,
        plan: 'pro',
        status: 'active',
      });
    }

    // Create session token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const token = createDemoSessionToken(user.fid, user.username, expiresAt);

    // Cast the reply to any to use setCookie which Fastify typings don't fully expose
    return (reply as any)
      .setCookie(DEMO_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      .send({
        user: {
          id: user.id,
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          plan: user.plan,
        },
      });
  });

  // Get all settings
  app.get('/api/settings', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await requireAuth(req, db);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    let prefs = await preferencesRepository.findByUserId(db, user.id);
    if (!prefs) {
      prefs = await preferencesRepository.upsertByUserId(db, user.id, {});
    }

    return {
      voice: {
        language: prefs.language,
        tone: prefs.tone,
        replyStyle: prefs.replyStyle,
        humorLevel: 50,
        technicalDepth: 50,
        conciseVsDetailed: 50,
        exampleCasts: [],
      },
      alerts: {
        allowedTopics: prefs.allowedTopics,
        blockedTopics: prefs.blockedTopics,
        riskTolerance: prefs.riskTolerance,
        frequency: prefs.notificationFrequency,
        allowMiniAppNotifications: prefs.allowMiniAppNotifications,
        allowDirectCasts: prefs.allowDirectCasts,
        dailyAlertLimit: prefs.dailyAlertLimit,
      },
      automation: {
        autoReplyMode: prefs.autoReplyMode,
        mentionOnlyMode: true,
        preferredChannels: prefs.preferredChannels,
      },
    };
  });

  // Update all settings
  app.patch('/api/settings', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await requireAuth(req, db);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid settings', details: parsed.error.errors });
    }

    const { voice, alerts, automation } = parsed.data;

    // Build preferences update
    const prefsUpdate: Record<string, unknown> = {};
    if (alerts) {
      if (alerts.allowedTopics !== undefined) prefsUpdate.allowedTopics = alerts.allowedTopics;
      if (alerts.blockedTopics !== undefined) prefsUpdate.blockedTopics = alerts.blockedTopics;
      if (alerts.riskTolerance !== undefined) prefsUpdate.riskTolerance = alerts.riskTolerance;
      if (alerts.frequency !== undefined) prefsUpdate.notificationFrequency = alerts.frequency;
      if (alerts.allowMiniAppNotifications !== undefined) prefsUpdate.allowMiniAppNotifications = alerts.allowMiniAppNotifications;
      if (alerts.allowDirectCasts !== undefined) prefsUpdate.allowDirectCasts = alerts.allowDirectCasts;
      if (alerts.dailyAlertLimit !== undefined) prefsUpdate.dailyAlertLimit = alerts.dailyAlertLimit;
    }
    if (automation) {
      if (automation.autoReplyMode !== undefined) prefsUpdate.autoReplyMode = automation.autoReplyMode;
      if (automation.preferredChannels !== undefined) prefsUpdate.preferredChannels = automation.preferredChannels;
    }
    // Note: voice settings (language, tone, etc.) are stored differently in schema
    // This is a simplified version - voice prefs would need schema extension for full impl

    const prefs = await preferencesRepository.upsertByUserId(db, user.id, prefsUpdate);

    return {
      voice: {
        language: prefs.language,
        tone: prefs.tone,
        replyStyle: prefs.replyStyle,
        humorLevel: 50,
        technicalDepth: 50,
        conciseVsDetailed: 50,
        exampleCasts: [],
      },
      alerts: {
        allowedTopics: prefs.allowedTopics ?? [],
        blockedTopics: prefs.blockedTopics ?? [],
        riskTolerance: prefs.riskTolerance as 'low' | 'medium' | 'high',
        frequency: prefs.notificationFrequency as 'realtime' | 'digest' | 'minimal',
        allowMiniAppNotifications: prefs.allowMiniAppNotifications,
        allowDirectCasts: prefs.allowDirectCasts,
        dailyAlertLimit: prefs.dailyAlertLimit,
      },
      automation: {
        autoReplyMode: prefs.autoReplyMode as 'off' | 'draft' | 'publish',
        mentionOnlyMode: true,
        preferredChannels: prefs.preferredChannels ?? [],
      },
    };
  });

  // Get voice settings
  app.get('/api/settings/voice', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await requireAuth(req, db);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    let prefs = await preferencesRepository.findByUserId(db, user.id);
    if (!prefs) {
      prefs = await preferencesRepository.upsertByUserId(db, user.id, {});
    }

    return {
      language: prefs.language,
      tone: prefs.tone,
      replyStyle: prefs.replyStyle,
      humorLevel: 50,
      technicalDepth: 50,
      conciseVsDetailed: 50,
      exampleCasts: [],
    };
  });

  // Update voice settings
  app.patch('/api/settings/voice', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await requireAuth(req, db);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = voiceSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid voice settings', details: parsed.error.errors });
    }

    const { language, tone, replyStyle } = parsed.data;
    const prefs = await preferencesRepository.upsertByUserId(db, user.id, {
      ...(language && { language }),
      ...(tone && { tone }),
      ...(replyStyle && { replyStyle }),
    });

    return {
      language: prefs.language,
      tone: prefs.tone,
      replyStyle: prefs.replyStyle,
      humorLevel: 50,
      technicalDepth: 50,
      conciseVsDetailed: 50,
      exampleCasts: [],
    };
  });

  // Get alert settings
  app.get('/api/settings/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await requireAuth(req, db);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    let prefs = await preferencesRepository.findByUserId(db, user.id);
    if (!prefs) {
      prefs = await preferencesRepository.upsertByUserId(db, user.id, {});
    }

    return {
      allowedTopics: prefs.allowedTopics ?? [],
      blockedTopics: prefs.blockedTopics ?? [],
      riskTolerance: prefs.riskTolerance,
      frequency: prefs.notificationFrequency,
      allowMiniAppNotifications: prefs.allowMiniAppNotifications,
      allowDirectCasts: prefs.allowDirectCasts,
      dailyAlertLimit: prefs.dailyAlertLimit,
    };
  });

  // Update alert settings
  app.patch('/api/settings/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await requireAuth(req, db);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = alertSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid alert settings', details: parsed.error.errors });
    }

    const prefs = await preferencesRepository.upsertByUserId(db, user.id, {
      allowedTopics: parsed.data.allowedTopics,
      blockedTopics: parsed.data.blockedTopics,
      riskTolerance: parsed.data.riskTolerance,
      notificationFrequency: parsed.data.frequency,
      allowMiniAppNotifications: parsed.data.allowMiniAppNotifications,
      allowDirectCasts: parsed.data.allowDirectCasts,
      dailyAlertLimit: parsed.data.dailyAlertLimit,
    });

    return {
      allowedTopics: prefs.allowedTopics ?? [],
      blockedTopics: prefs.blockedTopics ?? [],
      riskTolerance: prefs.riskTolerance,
      frequency: prefs.notificationFrequency,
      allowMiniAppNotifications: prefs.allowMiniAppNotifications,
      allowDirectCasts: prefs.allowDirectCasts,
      dailyAlertLimit: prefs.dailyAlertLimit,
    };
  });
}

async function requireAuth(req: FastifyRequest, db: ReturnType<typeof getDB>) {
  const cookieHeader = req.headers.cookie ?? '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );

  const token = cookies[DEMO_COOKIE];
  if (!token) return null;

  const { verifyDemoSessionToken } = await import('@pulo/auth');
  const payload = verifyDemoSessionToken(token);
  if (!payload) return null;

  return userRepository.findByFid(db, payload.fid);
}
