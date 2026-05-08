// Session middleware for API routes — extracts user from request context

import type { AuthUser } from '@pulo/auth';

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | null;
  }
}

export function getSessionUser(c: {
  get: (key: 'user') => AuthUser | null;
}): AuthUser | null {
  return c.get('user');
}

export function requireAuth(c: {
  get: (key: 'user') => AuthUser | null;
}): AuthUser {
  const user = c.get('user');
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
