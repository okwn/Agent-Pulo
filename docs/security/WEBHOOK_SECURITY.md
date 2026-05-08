# Webhook Security

How PULO verifies and processes incoming webhooks.

## Webhook Sources

PULO receives webhooks from:
- Neynar (cast events, mention events)
- Internal system events

## Verification Process

### Neynar Webhook Verification

1. **Signature Reception**: Webhooks include `x-neynar-signature` header
2. **Timestamp Validation**: `x-webhook-timestamp` header prevents replay attacks
3. **HMAC Verification**: Signature is verified using HMAC-SHA256

```
signature = HMAC-SHA256(timestamp + body, secret)
```

### Implementation

```typescript
// packages/farcaster/src/webhook.ts
const isValid = verifyNeynarSignature(body, signature, timestamp, secret);
if (!isValid) {
  return { error: 'INVALID_SIGNATURE' };
}
```

## Security Modes

### Mock Mode (Development)

- Webhook signature is not verified
- Accepts any incoming webhook
- Used for local development only
- Logs warning: "Mock mode: accepting webhook without verification"

### Live Mode (Production)

- Webhook signature is required
- Invalid signatures return 401 Unauthorized
- Signature verification uses timing-safe comparison

## Verification in Routes

```typescript
// apps/api/src/routes/webhook.ts
app.post('/api/webhook/farcaster', async (req, reply) => {
  if (mode === 'mock') {
    // Accept without verification
    return { received: true, verified: false };
  }

  const signature = req.headers['x-neynar-signature'];
  if (!signature) {
    return reply.code(401).send({ error: 'MISSING_SIGNATURE' });
  }

  const isValid = await verifyWebhook(body, signature, secret);
  if (!isValid) {
    return reply.code(401).send({ error: 'INVALID_SIGNATURE' });
  }

  return { received: true, verified: true };
});
```

## Anti-Replay Measures

1. **Timestamp Check**: Webhooks older than 5 minutes are rejected
2. **Idempotency**: Duplicate events are detected and ignored
3. **Single-Use Tokens**: Event deduplication prevents replay

## Fail-Safe Behavior

If webhook verification fails:
- Log the failure with details
- Return 401 Unauthorized
- Do not process the event
- Do not expose internal error details

## Testing Webhooks

### Local Development

Use the test endpoint (development only):

```bash
curl -X POST http://localhost:4311/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"type": "mention", "fid": 123, "text": "test"}'
```

### Production Verification

Verify webhook signature manually:

```bash
# Generate expected signature
echo -n "${TIMESTAMP}${BODY}" | openssl dgst -sha256 -hmac "${SECRET}"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEYNAR_WEBHOOK_SECRET` | Live mode | Secret for signature verification |
| `PULO_FARCASTER_MODE` | Yes | `mock` or `live` |

## Security Checklist

- [ ] `PULO_FARCASTER_MODE` is `live` in production
- [ ] `NEYNAR_WEBHOOK_SECRET` is set in production
- [ ] Webhook endpoint is not exposed to unknown origins
- [ ] Invalid signatures are logged and rejected
- [ ] Mock mode is not accessible in production