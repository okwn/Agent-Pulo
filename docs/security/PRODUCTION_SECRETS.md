# Production Secrets Management

How to manage secrets in PULO for production deployments.

## Required Secrets

### Database

```bash
DATABASE_URL=postgresql://user:password@host:5432/pulo
```

### Redis

```bash
REDIS_URL=redis://host:6379
```

### Neynar (Farcaster Integration)

```bash
NEYNAR_API_KEY=your_real_neynar_api_key
NEYNAR_WEBHOOK_SECRET=your_webhook_secret
```

### LLM Providers (Optional in Mock Mode)

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Secret Management Options

### 1. Environment Variables (Simplest)

Set in deployment platform (Vercel, Railway, etc.):

```bash
# Build-time not needed - loaded at runtime
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEYNAR_API_KEY=...
```

### 2. .env File (Development)

Create `.env` in project root:

```bash
# DO NOT COMMIT THIS FILE
DATABASE_URL=postgresql://user:password@host:5432/pulo
REDIS_URL=redis://host:6379
NEYNAR_API_KEY=your_key_here
```

Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```

### 3. Secret Manager (Production)

For production, use a secret manager:

- AWS Secrets Manager
- GCP Secret Manager
- HashiCorp Vault
- Doppler

## Production Startup Checks

PULO enforces security at startup:

```typescript
// apps/api/src/middleware/security.ts
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

## Verification

### Run Secret Scanner

```bash
node scripts/secret-scanner.mjs
```

This checks for accidentally committed secrets.

### Doctor Check

```bash
pnpm doctor
```

Verifies environment is properly configured.

## Docker Production

### Build Args

Pass secrets at runtime, not build time:

```dockerfile
# Dockerfile - WRONG
ARG NEYNAR_API_KEY
RUN echo $NEYNAR_API_KEY > /app/key  # Secret in image!
```

```dockerfile
# Dockerfile - CORRECT
# No secrets in Dockerfile
CMD ["node", "dist/server.js"]
# Secrets passed via environment at runtime
```

### docker-compose Production

```yaml
services:
  api:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEYNAR_API_KEY=${NEYNAR_API_KEY}
      - NODE_ENV=production
    # secrets:
    #   - file: /run/secrets/api_key  # Docker secrets
```

## Security Checklist

- [ ] No secrets in `.env` that gets committed
- [ ] `.env` is in `.gitignore`
- [ ] No secrets in Docker images
- [ ] No secrets in CI/CD logs
- [ ] Secrets are rotated regularly
- [ ] Production fails to start without required secrets
- [ ] `PLACEHOLDER` values are rejected