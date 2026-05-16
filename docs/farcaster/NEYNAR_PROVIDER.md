# Far caster Provider — Neynar Integration

## Overview

`@pulo/farcaster` provides an abstraction layer over Neynar with full mock/live mode separation. All live API calls are gated behind `PULO_FARCASTER_MODE=live`.

## Provider Architecture

```
getProvider() → MockFarcasterProvider | NeynarFarcasterProvider
```

- **mock mode**: All calls use `MockFarcasterProvider` — zero external dependencies, zero keys required
- **live mode**: All calls use `Neyn arFarcasterProvider` — requires `NEYNAR_API_KEY` + `FARCASTER_BOT_SIGNER_UUID`

## Provider Interface

```typescript
interface IFarcasterProvider extends IFarcasterReadProvider {
  write: IFarcasterWriteProvider;
  notifications: IFarcasterNotificationProvider;
  webhook: IWebhookVerifier;
  mode: 'mock' | 'live';
  providerName: string;
}
```

## Read Operations

All read methods live on the provider directly (provider extends IFarcasterReadProvider):

| Method | Description |
|--------|-------------|
| `getCastByHash(hash)` | Fetch a single cast by hash |
| `getCastThread(hash, options?)` | Fetch cast + replies |
| `getUserByFid(fid)` | Fetch user by FID |
| `getUserByUsername(username)` | Fetch user by username |
| `searchCasts(query, options?)` | Search casts |
| `getChannelCasts(channelId, options?)` | Get casts in a channel |
| `getReplies(castHash, options?)` | Get replies to a cast |
| `getUserRecentCasts(fid, options?)` | Get recent casts by user |

## Write Operations

Write methods are on `provider.write`:

| Method | Description |
|--------|-------------|
| `publishCast(text, options)` | Publish a new cast |
| `publishReply(parentHash, text, options)` | Reply to a cast |
| `deleteCast(hash, signerUuid)` | Delete a cast |

## Error Codes

All FarError subclasses have machine-readable codes:

| Code | Class | When |
|------|-------|------|
| `FARCASTER_API_KEY_MISSING` | `ApiKeyMissingError` | NEYNAR_API_KEY not set or placeholder |
| `FARCASTER_SIGNER_MISSING` | `SignerMissingError` | FARCASTER_BOT_SIGNER_UUID not set or placeholder |
| `FARCASTER_CAST_FETCH_FAILED` | `CastFetchError` | Could not fetch cast (404 or network error) |
| `FARCASTER_PUBLISH_FAILED` | `PublishFailedError` | Publish rejected (HTTP error) |
| `FARCASTER_RATE_LIMITED` | `RateLimitError` | Neynar rate limit hit (429, retryable) |
| `FARCASTER_USER_FETCH_FAILED` | `UserNotFoundError` | User lookup failed |
| `FARCASTER_SIGNER_MISSING` | `SignerError` | Signer rejected publish (403) |

## Live Mode Requirements

```bash
# Required
NEYNAR_API_KEY=...
FARCASTER_BOT_SIGNER_UUID=...   # UUID from Neynar dashboard

# Optional
NEYNAR_WEBHOOK_SECRET=...       # For webhook signature verification
NEYNAR_CLIENT_ID=...            # OAuth client ID
```

## Safe Failure Without Keys

When `PULO_FARCASTER_MODE=live` but keys are missing, the factory throws immediately:

```typescript
// throws ApiKeyMissingError or SignerMissingError before any API call
const provider = getProvider();
```

No API call is ever made without all required keys present.

## Idempotency

Every write call accepts an `idempotencyKey` in options. The `ActionExecutor` passes `publish-reply:{runId}` for replies, preventing duplicate publishes on retry.

```typescript
await provider.write.publishReply(parentHash, text, {
  signerUuid,
  idempotencyKey: `publish-reply:${runId}`,
});
```

The `withIdempotencyKey()` wrapper in `@pulo/farcaster` also provides in-flight deduplication for concurrent requests with the same key.

## Mock Mode

Mock mode (`PULO_FARCASTER_MODE=mock`) requires zero keys. All reads return deterministic fixture data. All writes return fake cast hashes without any network calls.

Mock state can be controlled via admin routes:
- `POST /api/admin/mock/farcaster/rate-limit` — enable simulated rate limiting
- `POST /api/admin/mock/farcaster/clear` — clear mock write history

## Testing the Live Provider

```bash
# Check readiness
pnpm farcaster:check

# Start in live mode
NEYNAR_API_KEY=sk_... FARCASTER_BOT_SIGNER_UUID=... PULO_FARCASTER_MODE=live pnpm dev:api
```