// Session middleware for API routes — extracts user from request context

import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '@pulo/auth';

declare module 'fastify' {
  interface FastifyRequest {
    sessionUser: AuthUser | null;
  }
}

export function getSessionUser(req: FastifyRequest): AuthUser | null {
  return req.sessionUser;
}

export function requireAuth(req: FastifyRequest): AuthUser {
  const user = req.sessionUser;
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
