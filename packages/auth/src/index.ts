// @pulo/auth — Authentication abstraction layer
// Provides a uniform interface for Sign In with Farcaster (future) and Demo auth

import type { User } from '@pulo/db/src/schema.js';

export interface AuthUser {
  id: number;
  fid: number;
  username: string;
  displayName: string | null;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  isAdmin: boolean;
}

export interface AuthSession {
  user: AuthUser;
  provider: 'demo' | 'farcaster' | 'neynar';
  expiresAt: Date;
}

export interface AuthProvider {
  /** Human-readable name for the auth provider */
  readonly name: string;

  /** Get current user from request context (cookie, header, etc.) */
  getUser(request: Request): Promise<AuthUser | null>;

  /** Create a session for a user (returns session token/cookie instructions) */
  createSession(user: AuthUser): Promise<SessionCreated>;

  /** Invalidate current session */
  destroySession(request: Request): Promise<void>;

  /** Sign out - clears session */
  signOut(request: Request): Promise<void>;
}

export interface SessionCreated {
  setCookie?: {
    name: string;
    value: string;
    options: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      maxAge?: number;
      path?: string;
    };
  };
  redirectTo?: string;
}

export interface DemoAuthConfig {
  defaultFid?: number;
  defaultUsername?: string;
  sessionDurationMs?: number;
}

const DEMO_COOKIE = 'pulo_demo_session';
const DEMO_SECRET = process.env.DEMO_AUTH_SECRET ?? 'demo-secret-change-in-production';

export function createDemoSessionToken(fid: number, username: string, expiresAt: Date): string {
  const payload = { fid, username, exp: expiresAt.getTime() };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = Buffer.from(`${data}.${DEMO_SECRET}`).toString('base64url');
  return `${data}.${sig}`;
}

export function verifyDemoSessionToken(token: string): { fid: number; username: string } | null {
  try {
    const [dataB64, sigB64] = token.split('.');
    const expectedSig = Buffer.from(`${dataB64}.${DEMO_SECRET}`).toString('base64url');
    if (sigB64 !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return { fid: payload.fid, username: payload.username };
  } catch {
    return null;
  }
}

export class DemoAuthProvider implements AuthProvider {
  readonly name = 'demo';

  constructor(private config: DemoAuthConfig = {}) {}

  async getUser(request: Request): Promise<AuthUser | null> {
    const cookieHeader = request.headers.get('cookie') ?? '';
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

    // Return demo user - in real impl would fetch from DB
    return {
      id: payload.fid,
      fid: payload.fid,
      username: payload.username,
      displayName: payload.username,
      plan: 'pro',
      isAdmin: payload.fid === 1, // FID 1 is admin in demo mode
    };
  }

  async createSession(user: AuthUser): Promise<SessionCreated> {
    const expiresAt = new Date(Date.now() + (this.config.sessionDurationMs ?? 7 * 24 * 60 * 60 * 1000));
    const token = createDemoSessionToken(user.fid, user.username, expiresAt);
    return {
      setCookie: {
        name: DEMO_COOKIE,
        value: token,
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
          path: '/',
        },
      },
    };
  }

  async destroySession(request: Request): Promise<void> {
    // Cookie clearing is handled by client
  }

  async signOut(request: Request): Promise<void> {
    // Session destruction handled by client clearing cookie
  }
}

export class FarcaSterAuthProvider implements AuthProvider {
  readonly name = 'farcaster';

  async getUser(request: Request): Promise<AuthUser | null> {
    // TODO: Implement SIWF verification
    // 1. Get FID from request header or body
    // 2. Verify signature with signedKeyRequest
    // 3. Fetch user from DB or create if not exists
    throw new Error('SIWF not yet implemented - see FARCASTER_AUTH_PLAN.md');
  }

  async createSession(user: AuthUser): Promise<SessionCreated> {
    throw new Error('SIWF not yet implemented - see FARCASTER_AUTH_PLAN.md');
  }

  async destroySession(request: Request): Promise<void> {
    throw new Error('SIWF not yet implemented - see FARCASTER_AUTH_PLAN.md');
  }

  async signOut(request: Request): Promise<void> {
    throw new Error('SIWF not yet implemented - see FARCASTER_AUTH_PLAN.md');
  }
}

export class NeynarAuthProvider implements AuthProvider {
  readonly name = 'neynar';

  constructor(private apiKey: string = process.env.NEYNAR_API_KEY ?? '') {}

  async getUser(request: Request): Promise<AuthUser | null> {
    // TODO: Implement Neynar Signer verification
    // 1. Get signer UUID from request
    // 2. Verify with Neynar API
    // 3. Fetch user from DB
    throw new Error('Neynar auth not yet implemented - see FARCASTER_AUTH_PLAN.md');
  }

  async createSession(user: AuthUser): Promise<SessionCreated> {
    throw new Error('Neynar auth not yet implemented - see FARCASTER_AUTH_PLAN.md');
  }

  async destroySession(request: Request): Promise<void> {
    throw new Error('Neynar auth not yet implemented - see FARCASTER_AUTH_PLAN.md');
  }

  async signOut(request: Request): Promise<void> {
    throw new Error('Neynar auth not yet implemented - see FARCASTER_AUTH_PLAN.md');
  }
}

export interface AuthFactoryConfig {
  demo?: DemoAuthConfig;
  farcaster?: Record<string, unknown>;
  neynar?: { apiKey: string };
}

let _authProvider: AuthProvider | null = null;

export function createAuthProvider(config?: AuthFactoryConfig): AuthProvider {
  if (_authProvider) return _authProvider;

  const mode = config ? 'demo' : 'demo'; // Default to demo mode

  switch (mode) {
    case 'demo':
      _authProvider = new DemoAuthProvider(config?.demo);
      break;
    case 'farcaster':
      _authProvider = new FarcaSterAuthProvider();
      break;
    case 'neynar':
      _authProvider = new NeynarAuthProvider(config?.neynar?.apiKey);
      break;
    default:
      _authProvider = new DemoAuthProvider();
  }

  return _authProvider;
}

export function resetAuthProvider(): void {
  _authProvider = null;
}

export { DEMO_COOKIE };
