# Security Checklist

PULO security requirements and verification.

## Environment Variables

### Required in Production

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `REDIS_URL` - Redis connection string
- [ ] `NEYNAR_API_KEY` - Neynar API key (not a placeholder)
- [ ] `NODE_ENV=production` - Must be set for production

### Optional but Recommended

- [ ] `NEYNAR_WEBHOOK_SECRET` - For webhook signature verification
- [ ] `SENTRY_DSN` - For error tracking
- [ ] `LOGDNA_KEY` - For log aggregation

### Never Commit

- [ ] API keys (OpenAI, Anthropic, Neynar)
- [ ] Database passwords
- [ ] Webhook secrets
- [ ] Private keys or seed phrases
- [ ] JWT secrets

## Startup Checks

### Production Mode Enforcement

- [ ] Server fails to start if required secrets are missing in production
- [ ] Server warns if `ALLOWED_ORIGINS=*` in production
- [ ] Mock mode is not usable in production

### Environment Validation

- [ ] All required env vars are validated at startup
- [ ] Invalid env vars cause clear error messages
- [ ] Placeholder values (e.g., "PLACEHOLDER") are rejected

## API Security

### CORS Policy

- [ ] CORS origins are explicitly configured
- [ ] Wildcard origins (`*`) are not used in production
- [ ] Credentials are properly handled

### Rate Limiting

- [ ] Rate limit middleware is active
- [ ] Excessive requests return 429 status
- [ ] Rate limits are per-IP

### Request Limits

- [ ] Body size is limited (1MB default)
- [ ] Oversized requests return 413 status
- [ ] Content-Type is validated

### Admin Routes

- [ ] All `/api/admin/*` routes require authentication
- [ ] Only admin users (FID 1 in demo mode) can access
- [ ] Non-admin requests return 403

### Webhook Routes

- [ ] Webhook signature is verified in live mode
- [ ] Invalid signatures return 401
- [ ] Mock mode accepts unverified webhooks

## Frontend Security

### Environment Isolation

- [ ] Frontend cannot access server-only env vars
- [ ] `NEXT_PUBLIC_` prefix required for client-side vars
- [ ] No API keys exposed to frontend bundle

### No Direct Browser Writes

- [ ] All Far caster writes go through API server
- [ ] Browser cannot directly call Neynar/Warpcast APIs
- [ ] Signer UUID is never sent to frontend

### Content Security Policy

- [ ] CSP headers are set on all responses
- [ ] Script sources are restricted
- [ ] Frame ancestors are blocked

## Data Protection

### User Data

- [ ] User plans are enforced (free/pro limits)
- [ ] Rate limits prevent abuse
- [ ] User consent is required for alerts

### Admin Actions

- [ ] All admin actions are audit logged
- [ ] Audit logs include actor, action, target, timestamp
- [ ] Audit logs include IP address when available

## Secret Scanner

Run `pnpm secret:scan` to check for accidentally committed secrets:

```bash
pnpm secret:scan
```

Expected output when clean:
```
🔒 PULO Secret Scanner

Scanning: /path/to/project

✅ No secrets detected!
```

## Verification Commands

```bash
# Check production readiness
pnpm doctor

# Scan for secrets
node scripts/secret-scanner.mjs

# Run all tests
pnpm test
```

## Common Issues

### "Missing signature" in production

Ensure `NEYNAR_WEBHOOK_SECRET` is set in environment.

### "CORS origin rejected"

Add your domain to `ALLOWED_ORIGINS` env var (comma-separated).

### "Rate limit exceeded"

Wait before retrying, or adjust `RATE_LIMIT_PER_MINUTE` env var.

### "Admin access required"

Ensure you have a valid session cookie from demo login or proper auth.