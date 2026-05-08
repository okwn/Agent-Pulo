# PULO Authentication Model

## Overview
PULO uses a provider-based authentication system that abstracts over different auth methods (Demo, SIWF, Neynar) while providing a unified interface for the application.

## Auth Provider Interface

```typescript
interface AuthProvider {
  readonly name: string;
  getUser(request: Request): Promise<AuthUser | null>;
  createSession(user: AuthUser): Promise<SessionCreated>;
  destroySession(request: Request): Promise<void>;
  signOut(request: Request): Promise<void>;
}
```

## Auth Providers

### DemoAuthProvider
- **Purpose**: Development and testing without external dependencies
- **Mechanism**: Cookie-based session with signed token
- **Token**: Base64URL-encoded JSON with FID, username, expiry + signature
- **Cookie**: `pulo_demo_session`, httpOnly, secure in production
- **Expiry**: 7 days (configurable)

### FarcaSterAuthProvider (Placeholder)
- **Purpose**: Production Sign In with Farcaster (SIWF)
- **Status**: Not yet implemented
- **Mechanism**: Will verify `SignedKeyRequest` from Neynar/wallet
- **See**: `FARCASTER_AUTH_PLAN.md` for implementation plan

### NeynarAuthProvider (Placeholder)
- **Purpose**: Alternative Sign In with Neynar signer
- **Status**: Not yet implemented
- **Mechanism**: Will verify Neynar signer UUID
- **See**: `FARCASTER_AUTH_PLAN.md` for implementation plan

## Session Flow

### Demo Mode
1. User submits FID + username
2. Backend upserts user in DB
3. Backend creates signed session token
4. Cookie set with session token
5. Subsequent requests include cookie
6. Middleware extracts FID from token
7. User data fetched from DB

### Future SIWF Mode (Planned)
1. User clicks "Sign in with Warpcast"
2. Redirect to Warpcast signer flow
3. User signs message with connected wallet
4. Verify signature against custody address
5. Fetch FID from signed message
6. Upsert user, create session
7. Continue with normal session flow

## User Model

```typescript
interface AuthUser {
  id: number;           // DB primary key
  fid: number;         // Farcaster ID
  username: string;
  displayName: string | null;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  isAdmin: boolean;    // Derived from FID (FID 1 = admin in demo)
}
```

## API Authentication

API routes use cookie-based auth via `DEMO_COOKIE`:

```typescript
// Middleware extracts user from cookie
const cookieHeader = request.headers.cookie ?? '';
const token = parseCookies(cookieHeader)[DEMO_COOKIE];
const payload = verifyDemoSessionToken(token);
const user = await userRepository.findByFid(db, payload.fid);
```

## Security Considerations

1. **Demo tokens**: Signed with server secret, tamper-evident
2. **HttpOnly cookies**: JS cannot access session cookie
3. **Secure flag**: Cookies only over HTTPS in production
4. **SameSite=lax**: CSRF protection while allowing navigation
5. **7-day expiry**: Balance between security and UX

## Production Readiness

Before production, implement one of:
- Sign In with Far caster (SIWF) via Neynar
- Neynar Signer authentication
- OAuth-based auth (future)

Demo mode is NOT suitable for production use.
