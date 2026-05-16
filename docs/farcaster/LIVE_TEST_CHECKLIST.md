# Far caster Live Test Checklist

Run `pnpm farcaster:check` before any live testing.

## Pre-Flight Checks

```bash
pnpm farcaster:check
```

Expected output when ready:
```
✅ NEYNAR_API_KEY (set)
✅ FARCASTER_BOT_SIGNER_UUID (set)
✅ Ready for live testing
```

## Environment Setup

```bash
# Required for live mode
export PULO_FARCASTER_MODE=live
export NEYNAR_API_KEY=sk_live_...
export FARCASTER_BOT_SIGNER_UUID=uuid-from-neynar-dashboard

# Required for webhook delivery
export NEYNAR_WEBHOOK_SECRET=your-webhook-secret

# Optional
export NEYNAR_WEBHOOK_URL=https://your-public-domain.com
```

## Neynar Dashboard Setup

- [ ] Create a signer for the bot account at `neynar.com`
- [ ] Copy the Signer UUID into `FARCASTER_BOT_SIGNER_UUID`
- [ ] Create an API key with read/write permissions
- [ ] Copy the API key into `NEYNAR_API_KEY`
- [ ] Configure webhook URL to point to `/api/webhook/farcaster`
- [ ] Set the webhook secret in `NEYNAR_WEBHOOK_SECRET`

## Startup

```bash
# Option 1: Docker
docker compose up -d api worker

# Option 2: Dev server
NEYNAR_API_KEY=sk_live_... FARCASTER_BOT_SIGNER_UUID=... PULO_FARCASTER_MODE=live pnpm dev:api
```

## Smoke Tests

```bash
# 1. Health check
curl http://localhost:4311/health/ready
# Expected: 200 { "status": "ready", "checks": [...] }

# 2. Post a test cast via mock reply (verify pipeline)
curl -X POST http://localhost:4311/api/admin/mock/farcaster/reply \
  -H "Content-Type: application/json" \
  -d '{"parentHash": "mock-cast-001", "text": "Test reply from PULO"}'

# 3. Check worker health
curl http://localhost:4312/health/ready
# Expected: 200 { "status": "ready", "checks": [...] }

# 4. Check deep health
curl http://localhost:4311/health/deep | jq '.checks[] | {component, status}'
```

## What to Watch

```bash
# API logs
docker compose logs -f api | grep -E "farcaster|webhook|publish"

# Worker logs
docker compose logs -f worker | grep -E "job|mention|radar"
```

## Common Failures

| Error | Cause | Fix |
|-------|-------|-----|
| `FARCASTER_SIGNER_MISSING` | Signer UUID not set or placeholder | Set `FARCASTER_BOT_SIGNER_UUID` in `.env` |
| `FARCASTER_API_KEY_MISSING` | API key not set or placeholder | Set `NEYNAR_API_KEY` in `.env` |
| 401 from Neynar | Invalid API key | Check key in Neynar dashboard |
| 403 from Neynar | Signer not approved | Approve signer in Neynar dashboard |
| 429 from Neynar | Rate limit hit | Wait, use mock mode for bulk testing |
| Webhook not arriving | URL misconfigured | Check Neynar dashboard webhook URL |

## Going to Production

1. [ ] `pnpm farcaster:check` shows all keys set
2. [ ] Test casts publish successfully via `pnpm farcaster:check`
3. [ ] Webhook URL is accessible from public internet
4. [ ] `PULO_APP_ENV=production` is set
5. [ ] Health checks return 200/503 correctly
6. [ ] Rate limit handling works (mock: enable rate limit simulation)
7. [ ] SafetyGate blocks test with risky content