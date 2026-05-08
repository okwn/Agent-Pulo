// Composer routes — POST /api/composer/*, GET/POST/PATCH/DELETE /api/drafts/*

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  CastRewriteAgent,
  ThreadBuilderAgent,
  CastRatingAgent,
  HookScorer,
  ChannelRecommender,
  PublishSafetyCheck,
  translateText,
  getDraftStore,
  type Draft,
  type DraftStatus,
  type CastStyle,
} from '@pulo/composer';
import { DEMO_COOKIE, verifyDemoSessionToken } from '@pulo/auth';
import { userRepository } from '@pulo/db';

const logger = console;

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
  return userRepository.findByFid(req.server.db as any, payload.fid);
}

// ─── Composer Agents ─────────────────────────────────────────────────────────

const rewriteAgent = new CastRewriteAgent();
const threadAgent = new ThreadBuilderAgent();
const ratingAgent = new CastRatingAgent();
const hookScorer = new HookScorer();
const channelRecommender = new ChannelRecommender();
const safetyCheck = new PublishSafetyCheck();

// ─── Composer Routes ─────────────────────────────────────────────────────────

export async function composerRoutes(app: FastifyInstance) {
  // POST /api/composer/rewrite - Rewrite text in specified style
  app.post('/api/composer/rewrite', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      text: z.string().min(1).max(500),
      style: z.enum(['sharp', 'founder', 'technical', 'funny', 'concise', 'thread']),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { text, style } = parsed.data;

    try {
      const variant = await rewriteAgent.rewrite(text, style as CastStyle);
      return { variant };
    } catch (error) {
      logger.error('Rewrite failed:', error);
      return reply.status(500).send({ error: 'Rewrite failed' });
    }
  });

  // POST /api/composer/rewrite-multiple - Get multiple style variants
  app.post('/api/composer/rewrite-multiple', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      text: z.string().min(1).max(500),
      styles: z.array(z.enum(['sharp', 'founder', 'technical', 'funny', 'concise', 'thread'])).min(1),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { text, styles } = parsed.data;

    try {
      const variants = await rewriteAgent.rewriteMultiple(text, styles as CastStyle[]);
      return { variants };
    } catch (error) {
      logger.error('Rewrite multiple failed:', error);
      return reply.status(500).send({ error: 'Rewrite failed' });
    }
  });

  // POST /api/composer/thread - Build thread from text
  app.post('/api/composer/thread', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      text: z.string().min(1).max(1000),
      postCount: z.number().min(2).max(10).optional().default(5),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { text, postCount } = parsed.data;

    try {
      const thread = await threadAgent.buildThread(text, postCount);
      return thread;
    } catch (error) {
      logger.error('Thread build failed:', error);
      return reply.status(500).send({ error: 'Thread build failed' });
    }
  });

  // POST /api/composer/rate - Rate a cast
  app.post('/api/composer/rate', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      text: z.string().min(1).max(500),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { text } = parsed.data;

    try {
      const rating = await ratingAgent.rate(text);
      return rating;
    } catch (error) {
      logger.error('Rating failed:', error);
      return reply.status(500).send({ error: 'Rating failed' });
    }
  });

  // POST /api/composer/hook-score - Score and suggest hook improvements
  app.post('/api/composer/hook-score', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      text: z.string().min(1).max(300),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { text } = parsed.data;

    try {
      const [score, suggestions] = await Promise.all([
        hookScorer.score(text),
        hookScorer.suggestImprovements(text),
      ]);
      return { score, suggestions };
    } catch (error) {
      logger.error('Hook scoring failed:', error);
      return reply.status(500).send({ error: 'Hook scoring failed' });
    }
  });

  // POST /api/composer/channels - Get channel recommendations
  app.post('/api/composer/channels', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      text: z.string().min(1).max(500),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { text } = parsed.data;

    try {
      const recommendations = await channelRecommender.recommend(text);
      return { recommendations };
    } catch (error) {
      logger.error('Channel recommendation failed:', error);
      return reply.status(500).send({ error: 'Channel recommendation failed' });
    }
  });

  // POST /api/composer/translate - Translate text
  app.post('/api/composer/translate', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      text: z.string().min(1).max(500),
      targetLang: z.enum(['en', 'tr']),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { text, targetLang } = parsed.data;

    try {
      const translated = await translateText(text, targetLang);
      return { translated, sourceLang: targetLang === 'en' ? 'tr' : 'en' };
    } catch (error) {
      logger.error('Translation failed:', error);
      return reply.status(500).send({ error: 'Translation failed' });
    }
  });

  // POST /api/composer/safety-check - Check publish safety
  app.post('/api/composer/safety-check', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      text: z.string().min(1).max(500),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { text } = parsed.data;

    try {
      const check = await safetyCheck.check(text);
      return check;
    } catch (error) {
      logger.error('Safety check failed:', error);
      return reply.status(500).send({ error: 'Safety check failed' });
    }
  });
}

// ─── Draft Routes ─────────────────────────────────────────────────────────────

export async function draftRoutes(app: FastifyInstance) {
  const store = getDraftStore();

  // GET /api/drafts - Get all drafts for user
  app.get('/api/drafts', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const allDrafts = await store.getAll();
      // Filter by user in real impl, return all for demo
      return { drafts: allDrafts };
    } catch (error) {
      logger.error('Get drafts failed:', error);
      return reply.status(500).send({ error: 'Failed to get drafts' });
    }
  });

  // POST /api/drafts - Create a new draft
  app.post('/api/drafts', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const bodySchema = z.object({
      text: z.string().min(1).max(500),
      status: z.enum(['draft', 'approved', 'published', 'ignored']).optional().default('draft'),
      sourceCastHash: z.string().nullable().optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    try {
      const draft = await store.create({
        text: parsed.data.text,
        status: parsed.data.status as DraftStatus,
        score: null,
        reason: null,
        sourceCastHash: parsed.data.sourceCastHash ?? null,
        publishedAt: null,
      });
      return draft;
    } catch (error) {
      logger.error('Create draft failed:', error);
      return reply.status(500).send({ error: 'Failed to create draft' });
    }
  });

  // GET /api/drafts/:id - Get a specific draft
  app.get('/api/drafts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = req.params as { id: string };

    try {
      const draft = await store.getById(id);
      if (!draft) {
        return reply.status(404).send({ error: 'Draft not found' });
      }
      return draft;
    } catch (error) {
      logger.error('Get draft failed:', error);
      return reply.status(500).send({ error: 'Failed to get draft' });
    }
  });

  // PATCH /api/drafts/:id - Update a draft
  app.patch('/api/drafts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = req.params as { id: string };

    const bodySchema = z.object({
      text: z.string().min(1).max(500).optional(),
      status: z.enum(['draft', 'approved', 'published', 'ignored']).optional(),
      score: z.number().min(1).max(10).nullable().optional(),
      reason: z.string().nullable().optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    try {
      const draft = await store.update(id, parsed.data);
      if (!draft) {
        return reply.status(404).send({ error: 'Draft not found' });
      }
      return draft;
    } catch (error) {
      logger.error('Update draft failed:', error);
      return reply.status(500).send({ error: 'Failed to update draft' });
    }
  });

  // POST /api/drafts/:id/publish - Publish a draft
  app.post('/api/drafts/:id/publish', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = req.params as { id: string };

    try {
      const draft = await store.getById(id);
      if (!draft) {
        return reply.status(404).send({ error: 'Draft not found' });
      }

      // Safety check before publish
      const safety = await safetyCheck.check(draft.text);
      if (!safety.safe) {
        return reply.status(400).send({
          error: 'Cannot publish - safety check failed',
          issues: safety.issues,
        });
      }

      // Update status to published
      const updated = await store.update(id, {
        status: 'published',
        publishedAt: new Date(),
      });

      return {
        success: true,
        draft: updated,
        message: 'Draft published successfully',
      };
    } catch (error) {
      logger.error('Publish draft failed:', error);
      return reply.status(500).send({ error: 'Failed to publish draft' });
    }
  });

  // POST /api/drafts/:id/ignore - Mark draft as ignored
  app.post('/api/drafts/:id/ignore', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = req.params as { id: string };

    try {
      const draft = await store.getById(id);
      if (!draft) {
        return reply.status(404).send({ error: 'Draft not found' });
      }

      const updated = await store.update(id, { status: 'ignored' });
      return { success: true, draft: updated };
    } catch (error) {
      logger.error('Ignore draft failed:', error);
      return reply.status(500).send({ error: 'Failed to ignore draft' });
    }
  });

  // DELETE /api/drafts/:id - Delete a draft
  app.delete('/api/drafts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromCookie(req);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = req.params as { id: string };

    try {
      const deleted = await store.delete(id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Draft not found' });
      }
      return { success: true };
    } catch (error) {
      logger.error('Delete draft failed:', error);
      return reply.status(500).send({ error: 'Failed to delete draft' });
    }
  });
}