# 03_FARCASTER_LIVE_READINESS.md

## Status: READY_LIVE_WITH_KEYS — Mock ✅ Live ⚠️ Keys Required

## Evidence from Code

| File | Status |
|------|--------|
| `packages/farcaster/src/index.ts` | ✅ `setMode()`/`getMode()` |
| `packages/farcaster/src/providers/mock.ts` | ✅ Works without keys |
| `packages/farcaster/src/providers/live.ts` | ✅ LiveNeynarProvider stub |
| `apps/api/src/routes/webhook.ts` | ✅ Webhook with signature verification |
| `apps/api/src/routes/farcaster.ts` | ✅ Cast fetch, reply draft |

## Working Pieces (Mock Mode)

- Webhook accepts all mentions — no signature check in mock
- Cast fetch returns mock data
- Reply drafts created in DB (no actual publish)
- Safety gate blocks publishes by default in mock

## Live-Key-Required

| Item | Key | Env |
|------|-----|-----|
| Neynar API | `NEYNAR_API_KEY` | `PULO_FARCASTER_MODE=live` |
| Bot signer | `FARCASTER_BOT_SIGNER_UUID` | Neynar dashboard |
| Webhook secret | `NEYNAR_WEBHOOK_SECRET` | Signature verification |
| Public URL | `NEYNAR_WEBHOOK_URL` | Must be HTTPS publicly reachable |

## Blockers

- `NEYNAR_WEBHOOK_URL` not set — webhooks won't reach server
- Reverse proxy or Cloudflare tunnel needed for public HTTPS

## Risks

1. **Rate limit** — `FARCASTER_RATE_LIMITED` under load; retry logic in `InMemoryRetryQueue`
2. **Webhook secret mismatch** — silent 401; test with curl before live
3. **FID 1 assumption** — admin guard uses `fid === 1`; bot must not be FID 1

## Commands After Keys

```bash
# .env additions
PULO_FARCASTER_MODE=live
NEYNAR_API_KEY=your_key
FARCASTER_BOT_SIGNER_UUID=your_uuid
NEYNAR_WEBHOOK_SECRET=your_secret
NEYNAR_WEBHOOK_URL=https://your-domain.com/api/webhook/farcaster

docker compose restart api worker
pnpm farcaster:check  # → ✅ FARCASTER_MODE is live
```