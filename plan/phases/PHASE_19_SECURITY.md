# Phase 19: Security Hardening

## Goal

Harden PULO against common security threats:
- Environment validation at startup
- Production mode checks
- CORS policy
- Rate limiting
- Admin route protection
- Webhook signature verification
- URL risk analysis
- Secret detection

## What Was Implemented

### 1. Environment Validation

**File**: `packages/shared/src/index.ts` (already existed)

```typescript
export function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${JSON.stringify(errors)}`);
  }
  return result.data;
}
```

### 2. Production Mode Enforcement

**File**: `apps/api/src/middleware/security.ts`

```typescript
export function enforceProductionMode() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['NEYNAR_API_KEY', 'DATABASE_URL', 'REDIS_URL'];
  const missing = required.filter(k => {
    const v = process.env[k];
    return !v || v.includes('PLACEHOLDER') || v === 'undefined';
  });

  if (missing.length > 0) {
    throw new Error(`Production requires: ${missing.join(', ')}`);
  }
}
```

### 3. CORS Policy

**File**: `apps/api/src/middleware/security.ts`

```typescript
export function getCorsOptions() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ];

  return {
    origin: (origin, callback) => {
      // Strict origin checking
      // No wildcard in production
    },
    credentials: true,
    // ...
  };
}
```

### 4. Rate Limiting

```typescript
// Rate limiter with per-IP tracking
// 100 requests per minute default
// Returns 429 when exceeded
```

### 5. Body Size Limits

```typescript
// 1MB max body size
// Returns 413 Payload Too Large
```

### 6. Secure Headers

```typescript
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; ...",
  'Strict-Transport-Security': 'max-age=31536000',
};
```

### 7. Webhook Signature Verification

**File**: `apps/api/src/routes/webhook.ts`

```typescript
app.post('/api/webhook/farcaster', async (req, reply) => {
  if (mode === 'mock') {
    return { received: true, verified: false };
  }

  const signature = req.headers['x-neynar-signature'];
  if (!signature) {
    return reply.code(401).send({ error: 'MISSING_SIGNATURE' });
  }

  // HMAC-SHA256 verification with timing-safe comparison
  const isValid = verifyNeynarSignature(body, signature, timestamp, secret);
  if (!isValid) {
    return reply.code(401).send({ error: 'INVALID_SIGNATURE' });
  }
});
```

### 8. URL Risk Analyzer

**File**: `packages/safety/src/url-analyzer.ts`

```typescript
export function analyzeURL(url: string): URLRiskAnalysis {
  // Detects:
  // - Impersonation domains
  // - URL shorteners
  // - Suspicious keywords
  // - Wallet connection requests
  // - Seed phrase requests
  // - Raw wallet addresses
  // - Risky TLDs
}

export function analyzeClaimSafety(claim: string, urls: string[]): ClaimSafetyResult {
  // Never says "official" unless verified
  // Warns about urgency tactics
  // Warns about financial guarantees
  // Checks for suspicious links
}
```

### 9. Admin Route Protection

```typescript
async function requireAdmin(req, reply) {
  const user = await getUserFromCookie(req);
  if (!user?.isAdmin) {
    return reply.status(403).send({ error: 'Admin access required' });
  }
  return user;
}
```

### 10. Audit Logging

```typescript
// All admin actions are logged
await logAuditEvent({
  action: 'ERROR_RETRY',
  actorFid: admin.fid,
  actorType: 'admin',
  targetType: 'error',
  targetId: id,
  ipAddress: req.ip,
});
```

### 11. Secret Scanner

**File**: `scripts/secret-scanner.mjs`

Detects:
- API keys (OpenAI, Anthropic, Neynar, GitHub)
- JWT tokens
- Private keys / seed phrases
- Database URLs with passwords
- Bearer tokens

## Files Created

| File | Purpose |
|------|---------|
| `apps/api/src/middleware/security.ts` | Security middleware (CORS, rate limit, headers) |
| `apps/api/src/routes/webhook.ts` | Webhook verification routes |
| `packages/safety/src/url-analyzer.ts` | URL risk analysis |
| `scripts/secret-scanner.mjs` | Secret detection script |

## Files Modified

| File | Changes |
|------|---------|
| `apps/api/src/server.ts` | Added security middleware, webhook routes |
| `apps/api/src/routes/admin.ts` | Added audit logging |
| `packages/observability/src/audit.ts` | Export audit functions |

## Documentation Created

| File | Purpose |
|------|---------|
| `docs/security/SECURITY_CHECKLIST.md` | Security requirements |
| `docs/security/WEBHOOK_SECURITY.md` | Webhook verification |
| `docs/security/CLAIM_SAFETY.md` | Claim/airdrop safety |
| `docs/security/PRODUCTION_SECRETS.md` | Secret management |
| `plan/phases/PHASE_19_SECURITY.md` | This file |

## Tests Added

| File | Coverage |
|------|----------|
| `packages/safety/test/url-analyzer.test.ts` | URL risk analysis, claim safety |

## Security Checklist

- [x] Production mode fails without required secrets
- [x] CORS policy is strict
- [x] Rate limiting is active
- [x] Body size is limited
- [x] Secure headers are set
- [x] Webhook signatures are verified in live mode
- [x] Admin routes require auth
- [x] Admin actions are audit logged
- [x] URL risk analyzer detects threats
- [x] Secret scanner catches accidental commits
- [x] No API keys in frontend bundle
- [x] No signer UUID in frontend

## Next Steps

Potential enhancements:
- Add request signing for API calls
- Implement IP allowlisting
- Add CAPTCHA for unauthenticated endpoints
- Add database encryption at rest
- Add audit log persistence (database, not just memory)