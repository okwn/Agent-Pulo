# FARCASTER_INTEGRATION_NOTES.md

## Neynar Integration

PULO uses Neynar for all Far interactions:

- **Webhooks:** Receive real-time mention/cast events
- **API:** Post casts, DMs, look up users/channels
- **Signer:** Bot identity managed via Neynar-managed signer

## Core Flows

### Mention Handling

```
Far → Neynar Webhook → Pulo API → Redis Queue → Worker → LLM → Neynar POST → Far
```

1. User mentions @pulo in a cast
2. Neynar sends webhook to `POST /webhook/farcaster`
3. API validates payload, checks rate limit
4. Job enqueued to Redis
5. Worker picks up, calls LLM
6. Response posted as mention reply via Neynar

### Truth Check Flow

```
User casts "!pulo is [claim]" → Neynar webhook → Worker analyzes → Reply posted
```

## Key Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/webhook/farcaster` | POST | Receive webhook events |
| `/health` | GET | Service health |
| `/health/ready` | GET | Readiness (DB + Redis) |

## Neynar Webhook Verification

```typescript
import { verifyWebhookSignature } from '@neynar/nodejs-sdk';

function validateWebhook(body: Buffer, signature: string): boolean {
  return verifyWebhookSignature(
    body,
    signature,
    process.env.NEYNAR_WEBHOOK_SECRET!
  );
}
```

## Signer Management

- Bot identity is a Far Fid with a Neynar-managed signer
- Signer UUID stored in `PULO_SIGNER_UUID` env var
- All cast/DM posting uses `signerUuid` from Neynar SDK
- Signer key never in code — only env-based

## Rate Limits (Neynar)

- Free tier: 100 API calls/minute
- Paid tier: 1000 API calls/minute
- Webhook delivery: up to 100 events/minute

## Testing

Use [Neynar DevTools](https://devtools.farcaster.xyz) to send test webhooks locally via ngrok or similar tunnel.