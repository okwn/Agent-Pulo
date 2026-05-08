# FARCASTER_ERRORS.md — Error Taxonomy

## Base Error: `FarError`

All Far provider errors extend `FarError` from `@pulo/farcaster`.

```typescript
class FarError extends Error {
  readonly code: string;
  readonly provider: string;
  readonly retryable: boolean;
  readonly statusCode?: number;
}
```

Use `FarError.is(err)` to check if any value is a FarError.

## Error Codes

| Code | Class | HTTP Status | Retryable | Description |
|---|---|---|---|---|
| `MISSING_CREDENTIALS` | `MissingCredentialsError` | 500 | No | Required API key or signer UUID is missing or placeholder |
| `INVALID_CREDENTIALS` | `InvalidCredentialsError` | 401 | No | API key or signer is rejected by the provider |
| `SIGNER_ERROR` | `SignerError` | 403 | No | Signer rejected the operation (not authorized) |
| `CAST_NOT_FOUND` | `CastNotFoundError` | 404 | No | Cast hash does not exist |
| `USER_NOT_FOUND` | `UserNotFoundError` | 404 | No | FID or username does not resolve |
| `CHANNEL_NOT_FOUND` | `ChannelNotFoundError` | 404 | No | Channel ID does not exist |
| `RATE_LIMIT` | `RateLimitError` | 429 | Yes | Provider rate limit hit; `retryAfterMs` available |
| `PUBLISH_ERROR` | `PublishError` | 502 | Yes | Cast publish failed (upstream error) |
| `DELETE_ERROR` | `DeleteError` | 502 | Yes | Cast deletion failed |
| `WEBHOOK_VERIFICATION` | `WebhookVerificationError` | 401 | No | Webhook signature mismatch |
| `WEBHOOK_PARSE` | `WebhookParseError` | 400 | No | Webhook body is not valid JSON or malformed |
| `MODE_MISMATCH` | `ModeMismatchError` | 409 | No | Operation requires different mode (live vs mock) |
| `PROVIDER_NOT_FOUND` | `ProviderNotFoundError` | 500 | No | No provider is configured |

## Error Helpers

### `isRetryable(err)`
Returns `true` for errors that should be retried with backoff.

```typescript
import { isRetryable } from '@pulo/farcaster';
if (isRetryable(err)) {
  await sleep(1000 * 2 ** attempt);
}
```

### `getErrorCode(err)`
Returns the error code string from any error.

```typescript
import { getErrorCode } from '@pulo/farcaster';
getErrorCode(new RateLimitError('Neynar')); // 'RATE_LIMIT'
```

## Neynar Provider-Specific Behavior

| HTTP Response | Error Thrown |
|---|---|
| 404 (cast/user not found) | `CastNotFoundError` / `UserNotFoundError` |
| 429 | `RateLimitError` with `retryAfterMs` from `Retry-After` header |
| 403 (signer rejected) | `SignerError` |
| 401 / invalid key | `InvalidCredentialsError` |
| Other non-ok | `FarError` with provider message |

## Handling Missing Credentials

The Neynar provider validates credentials at construction time:

```typescript
const provider = new NeynarFarcasterProvider(config);
// throws MissingCredentialsError if NEYNAR_API_KEY is missing/placeholder
```

To probe for credential availability without throwing:

```typescript
function isNeynarConfigured(): boolean {
  const key = process.env.NEYNAR_API_KEY ?? '';
  return Boolean(key) && !key.startsWith('PLACEHOLDER') && key !== 'undefined';
}
```

## Mode Mismatch

Calling live-mode operations in mock mode throws `ModeMismatchError`:

```typescript
import { requireLiveProvider } from '@pulo/farcaster';
const provider = requireLiveProvider(); // throws if mode === 'mock'
```

## Throwing in Practice

```typescript
import {
  MissingCredentialsError,
  CastNotFoundError,
  RateLimitError,
} from '@pulo/farcaster';

if (!signerUuid) {
  throw new MissingCredentialsError('Neynar', 'FARCASTER_BOT_SIGNER_UUID');
}
```