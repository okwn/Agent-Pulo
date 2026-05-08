# FARCASTER_PROVIDER.md — Provider Architecture

## Overview

`@pulo/farcaster` is the Far provider abstraction layer. It sits between the PULO agent core and the Far ecosystem (Neynar, Warpcast), providing a typed interface that works identically in both mock and live modes.

## Provider Interface

```
IFarcasterProvider
├── mode: FarMode           // 'mock' | 'live'
├── providerName: string     // 'mock' | 'neynar'
├── read: IFarcasterReadProvider
├── write: IFarcasterWriteProvider
├── notifications: IFarcasterNotificationProvider
└── webhook: IWebhookVerifier
```

## Read Provider (`IFarcasterReadProvider`)

Used by the agent to fetch on-chain and off-chain data. Never makes external calls in mock mode.

| Method | Returns | Notes |
|---|---|---|
| `getCastByHash(hash)` | `Promise<Cast>` | Fetches a cast by its hash |
| `getCastThread(hash, options?)` | `Promise<CastThread>` | Cast + replies up to `depth` levels |
| `getUserByFid(fid)` | `Promise<User>` | Resolves FID to user profile |
| `getUserByUsername(username)` | `Promise<User>` | Resolves @username to user profile |
| `searchCasts(query, options?)` | `Promise<SearchResult<Cast>>` | Search with cursor pagination |
| `getChannelCasts(channelId, options?)` | `Promise<SearchResult<Cast>>` | Channel cast feed |
| `getReplies(castHash, options?)` | `Promise<SearchResult<Cast>>` | All replies to a cast |
| `getUserRecentCasts(fid, options?)` | `Promise<SearchResult<Cast>>` | Recent casts by user |

## Write Provider (`IFarcasterWriteProvider`)

**Backend-only.** The web frontend must never call write methods. Write operations always require a `signerUuid` (the bot's signer UUID from Neynar). In mock mode, write methods track what would have been published without making external calls.

| Method | Returns | Notes |
|---|---|---|
| `publishCast(text, options)` | `Promise<PublishResult>` | Publishes a new cast. Options: `signerUuid` (required), `channelId`, `idempotencyKey` |
| `publishReply(parentHash, text, options)` | `Promise<PublishResult>` | Replies to a cast. Options: `signerUuid` (required), `idempotencyKey` |
| `deleteCast(hash, signerUuid)` | `Promise<void>` | Deletes a cast (live only) |

### Publish Options

```typescript
interface PublishCastOptions {
  signerUuid: string;   // Required — bot's Neynar signer UUID
  channelId?: string;   // Optional — e.g. "pulo-agent"
  idempotencyKey?: string; // Optional — for deduplication
}

interface PublishReplyOptions {
  signerUuid: string;
  idempotencyKey?: string;
}
```

## Notification Provider (`IFarcasterNotificationProvider`)

Sends notifications to users via the Far mini-app notification system and via direct casts.

| Method | Returns | Notes |
|---|---|---|
| `sendMiniAppNotification(fid, payload, key)` | `Promise<void>` | Sends a mini-app push notification |
| `sendDirectCast(fid, payload, key)` | `Promise<void>` | Sends a cast @mentioning the user |

### Notification Payload

```typescript
interface NotificationPayload {
  title: string;
  body: string;
  targetUrl?: string;
}

interface DirectCastPayload {
  message: string;
}
```

## Webhook Verifier (`IWebhookVerifier`)

Verifies incoming webhook requests from Neynar/Warpcast.

| Method | Returns | Notes |
|---|---|---|
| `verifyMentionWebhook(request)` | `Promise<WebhookVerificationResult>` | Verifies a mention webhook payload |
| `verifyCastWebhook?(request)` | `Promise<WebhookVerificationResult>` | Optional — verifies cast-only webhooks |

## Mode Gating

All external API calls are gated by the current mode:

- **`mock` mode** — All provider methods return mock data. No external HTTP calls. Used for local development and tests.
- **`live` mode** — Provider delegates to Neynar API. All required credentials must be present. Missing keys throw `MissingCredentialsError` at startup.

## Provider Factory

```typescript
import { getProvider, setMode, getMode } from '@pulo/farcaster';

// Get the current provider (auto-initializes based on mode)
const provider = getProvider();

// Set mode manually (usually driven by PULO_FARCASTER_MODE env)
setMode('live');

// Require a specific mode (throws ModeMismatchError otherwise)
import { requireLiveProvider } from '@pulo/farcaster';
const live = requireLiveProvider();
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PULO_FARCASTER_MODE` | No | `'mock'` (default) or `'live'` |
| `NEYNAR_API_KEY` | Live only | Neynar API key |
| `NEYNAR_WEBHOOK_SECRET` | Live only | Webhook signature secret |
| `FARCASTER_BOT_SIGNER_UUID` | Live + write ops | Bot's Neynar signer UUID |
| `WARPCAST_API_KEY` | Warpcast mode | Warpcast API key (future) |

## Mock Provider Behavior

The `MockFarcasterProvider` is used in tests and local dev:

- **Read methods** — Return static `MOCK_CASTS` and `MOCK_USERS` data
- **Write methods** — Track published casts in memory, never call external APIs
- **Notification methods** — Track sent notifications in memory arrays
- **Webhook verifier** — Accepts any non-empty JSON body, parses FID from `data.cast.author.fid`

### Inspecting Mock State

```typescript
const mock = provider as MockFarcasterProvider;
mock.notifications.getNotifications(); // [{ fid, payload, key }]
mock.notifications.getDirectCasts();   // [{ fid, payload, key }]
mock.write.getPublished();            // [{ hash, url }]
```