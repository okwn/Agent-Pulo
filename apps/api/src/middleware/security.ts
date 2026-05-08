// security.ts - Security middleware for Fastify

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createChildLogger } from '@pulo/observability';

const log = createChildLogger('security');

// ─── Rate Limiter ───────────────────────────────────────────────────────────────

interface RateLimitStore {
  counts: Map<string, { count: number; resetAt: number }>;
}

const rateLimitStore: RateLimitStore = { counts: new Map() };

export function rateLimit(options: { max: number; windowMs: number } = { max: 100, windowMs: 60000 }) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.counts.get(key);

    if (!entry || entry.resetAt < now) {
      rateLimitStore.counts.set(key, { count: 1, resetAt: now + options.windowMs });
      return;
    }

    entry.count++;
    if (entry.count > options.max) {
      log.warn({ ip: key, count: entry.count }, 'Rate limit exceeded');
      reply.code(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return reply;
    }
  };
}

// ─── Body Size Limit ────────────────────────────────────────────────────────────

export const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export function bodySizeLimit(options: { max: number } = { max: MAX_BODY_SIZE }) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > options.max) {
      log.warn({ contentLength: parseInt(contentLength, 10), max: options.max }, 'Body size limit exceeded');
      reply.code(413).send({
        error: 'PAYLOAD_TOO_LARGE',
        message: `Request body too large. Maximum size is ${options.max} bytes.`,
      });
      return reply;
    }
  };
}

// ─── CORS Configuration ────────────────────────────────────────────────────────

export function getCorsOptions() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:4310',
  ];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is allowed
      const allowed = allowedOrigins.some(o => {
        if (o === '*') return true;
        // Support wildcard subdomains
        if (o.startsWith('*.')) {
          const base = o.slice(2);
          return origin.endsWith(base) || origin === base;
        }
        return origin === o;
      });

      if (allowed) {
        callback(null, true);
      } else {
        log.warn({ origin }, 'CORS origin rejected');
        callback(new Error('CORS policy violation'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400, // 24 hours
  };
}

// ─── Secure Headers ───────────────────────────────────────────────────────────

export function getSecureHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs these
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.neynar.com https://api.warpcast.com",
      "frame-ancestors 'none'",
    ].join('; '),
  };
}

// ─── Apply Security Middleware ─────────────────────────────────────────────────

export async function applySecurityMiddleware(app: FastifyInstance) {
  // Rate limiting
  await app.addHook('onRequest', rateLimit({ max: 120, windowMs: 60000 }));

  // Body size limit
  await app.addHook('onRequest', bodySizeLimit({ max: MAX_BODY_SIZE }));

  // Security headers on response
  await app.addHook('onSend', async (req, reply) => {
    const headers = getSecureHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      reply.header(key, value);
    });
  });

  // Log security events
  await app.addHook('onRequest', async (req) => {
    if (req.url.startsWith('/api/admin')) {
      log.debug({
        url: req.url,
        method: req.method,
        ip: req.ip,
      }, 'Admin route access');
    }
  });
}

// ─── Production Mode Checks ───────────────────────────────────────────────────

export function enforceProductionMode() {
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'production') {
    // Check required secrets
    const required = [
      'NEYNAR_API_KEY',
      'DATABASE_URL',
      'REDIS_URL',
    ];

    const missing = required.filter(k => {
      const v = process.env[k];
      return !v || v.includes('PLACEHOLDER') || v === 'undefined';
    });

    if (missing.length > 0) {
      throw new Error(
        `Production mode requires: ${missing.join(', ')}. ` +
        'Set these environment variables or use NODE_ENV=development.'
      );
    }

    // Warn about insecure settings
    if (process.env.ALLOWED_ORIGINS === '*') {
      log.warn('ALLOWED_ORIGINS is set to *. This is insecure in production.');
    }
  }
}