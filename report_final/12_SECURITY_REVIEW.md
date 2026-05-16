# 12_SECURITY_REVIEW.md

## Status: ⚠️ READY_WITH_LIMITATIONS — Auth Stub Present, Production Auth Not Implemented

## Evidence

| File | Status |
|------|--------|
| `packages/auth/src/index.ts` | ✅ Demo session token (base64url HMAC) |
| `apps/api/src/middleware/security.ts` | ✅ Rate limit, body size, CORS, secure headers |
| `apps/api/src/routes/admin.ts` | ✅ `requireAdmin()` guard on all admin routes |
| `packages/safety/src/rate-limiter.ts` | ✅ Token bucket + fixed window + daily counter |
| `packages/safety/src/safety-gate.ts` | ✅ Block/review/allow with configurable thresholds |
| `packages/safety/src/errors.ts` | ✅ Structured error codes (no details leak) |
| `apps/api/src/middleware/session.ts` | ✅ Session middleware |

## Auth Status

| Provider | Status | Notes |
|----------|--------|-------|
| `DemoAuthProvider` | ✅ Working | Cookie `pulo_demo_session`, HMAC-signed, 7-day expiry |
| `FarcasterAuthProvider` | ❌ Stub only | `throw new Error('SIWF not yet implemented')` |
| `NeynarAuthProvider` | ❌ Stub only | `throw new Error('Neynar auth not yet implemented')` |

## Security Controls Implemented

### Input Validation
- All API routes use Zod/in-place validation
- Body size limit: 1MB max (`MAX_BODY_SIZE`)
- SQL injection prevented via Prisma parameterized queries
- XSS: Next.js default escaping, no `dangerouslySetInnerHTML` in admin pages

### Rate Limiting
- Per-IP token bucket rate limiter (`rateLimit()` in security.ts)
- Default: 120 requests/minute per IP
- Per-FID rate limiting in `SafetyGate` and `checkLimit()`
- Per-endpoint rate limits configurable via env

### Admin Protection
- `requireAdmin()` middleware on all `/api/admin/*` routes
- Checks `user.isAdmin` from session
- Admin audit log: all admin actions logged with FID + timestamp
- Demo admin session: FID 1 = admin (demo only)

### Secure Headers (via `security.ts`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000`
- CSP header set ( Next.js requires `'unsafe-inline'`)

### Cookie Security
- `httpOnly: true` — JS cannot read session cookie
- `secure: true` in production — HTTPS only
- `sameSite: lax` — CSRF protection

## Mocked Pieces

- Demo auth is working but FARCASTER SIWF and Neynar Signer auth are stubs
- In-memory rate limit store resets on restart
- In-memory daily counters reset on restart

## Live-Key-Required

| Security Feature | Key | Status |
|-----------------|-----|--------|
| Production admin auth | `DEMO_AUTH_SECRET` (change default) | ⚠️ Change secret before production |
| Neynar auth | `NEYNAR_API_KEY` | Stub — OAuth flow not implemented |
| SIWF auth | FID verification | Stub — not implemented |

## Blockers

1. **SIWF not implemented** — real production auth requires Sign In With Far caster OAuth; current system has no way to verify real user identity
2. **Neynar auth stub** — can't map real Neynar signers to users in production

## Risks

1. **Demo auth secret hardcoded** — `demo-secret-change-in-production` must be set via `DEMO_AUTH_SECRET` env var
2. **Rate limit store in-memory** — restart clears per-IP counters; bypass via concurrent requests before restart
3. **No RBAC beyond admin** — user plan tiers (free/pro/team) are read from DB but not enforced by middleware
4. **No IP allowlist** — admin routes accessible from any IP in dev mode
5. **CORS origin check** — `*` wildcard origin allowed in dev (localhost); check `ALLOWED_ORIGINS` before production
6. **No request signing** — webhook endpoint accepts any valid JSON; no HMAC verification from Neynar
7. **CSP allows 'unsafe-eval'** — required for Next.js SSR but broadens attack surface

## Recommended Fixes

```bash
# 1. Set strong demo auth secret before production
echo "DEMO_AUTH_SECRET=$(openssl rand -base64 48)" >> .env

# 2. Set allowed origins
echo "ALLOWED_ORIGINS=https://pulo.io,https://www.pulo.io" >> .env

# 3. Add webhook HMAC verification (when Neynar supports it)
# Implement in apps/api/src/routes/webhook.ts

# 4. Add Redis for rate limit persistence
echo "PULO_BUDGET_STORAGE=redis" >> .env

# 5. Implement SIWF before any production launch
# See docs/farcaster/FARCASTER_AUTH_PLAN.md
```

## Commands

```bash
# Verify requireAdmin is present on admin routes
grep -n "requireAdmin" apps/api/src/routes/admin.ts

# Verify secure headers applied
curl -I http://localhost:4311/health

# Check CORS headers
curl -v -X OPTIONS http://localhost:4311/api/composer/rewrite \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST"

# Verify CSP headers
curl -s http://localhost:4311/health | grep -i content-security-policy

# Test rate limiting
for i in $(seq 1 130); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4311/api/composer/rewrite \
    -H "Content-Type: application/json" \
    -d '{"text":"test"}'
done | sort | uniq -c
# Should see 429 after 120 requests
```