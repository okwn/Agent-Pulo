# docs/security/WEBHOOK_SECURITY.md

## Webhook Signature Verification

PULO verifies inbound webhooks from Neynar using HMAC-SHA256.

## Header Names

| Header | Value |
|--------|-------|
| Signature | `x-neynar-signature` |
| Timestamp | `x-webhook-timestamp` |

These are defined as constants in `apps/api/src/routes/webhook.ts`:
```typescript
const NEYNAR_SIGNATURE_HEADER = 'x-neynar-signature' as const;
const NEYNAR_TIMESTAMP_HEADER = 'x-webhook-timestamp' as const;
```

If Neynar changes these header names, update those constants and this document.

## Verification Method

```
expected = HMAC-SHA256(secret, timestamp_string + raw_body_string)
signature_valid = timing_safe_compare(signature, expected)
```

- **Algorithm:** HMAC-SHA256
- **Encoding:** hex (lower-case)
- **Signed payload:** `timestamp + raw_body` concatenated directly (no delimiter)
- **Comparison:** `timingSafeEqual` (timing-safe) to prevent timing attacks

## Implementation

- **File:** `apps/api/src/routes/webhook.ts`
- **Function:** `verifyNeynarSignature(body, signature, timestamp, secret)` — exported for testing
- **Also used by:** `NeynarWebhookVerifier` in `packages/farcaster/src/providers/neynar.ts`

## Mode Behavior

| Mode | Behavior |
|------|----------|
| `mock` (`PULO_FARCASTER_MODE=mock`) | Accepts all requests without verification (for local dev/test) |
| `live` (`PULO_FARCASTER_MODE=live`) | Requires valid signature + timestamp or returns 401 |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEYNAR_WEBHOOK_SECRET` | Required in live mode | Secret configured in Neynar developer dashboard for this webhook |
| `PULO_FARCASTER_MODE` | Yes | `mock` (default) or `live` |

## Neynar Dashboard Setup

1. Create an app at neynar.com
2. Navigate to Webhooks → Add Webhook
3. Set URL to `https://your-domain.com/api/webhook/farcaster`
4. Select events: `mention`, `cast.created`
5. Copy the webhook signing secret → set as `NEYNAR_WEBHOOK_SECRET`

## Testing Locally

```bash
# Generate a test signature
SECRET="your-test-secret"
TIMESTAMP=$(date +%s)
BODY='{"type":"mention","castHash":"test123","fid":100}'
SIGNATURE=$(echo -n "${TIMESTAMP}${BODY}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Send test webhook to local API
curl -X POST http://localhost:4311/api/webhook/farcaster \
  -H "Content-Type: application/json" \
  -H "x-neynar-signature: $SIGNATURE" \
  -H "x-webhook-timestamp: $TIMESTAMP" \
  -d "$BODY"

# In mock mode: {"received":true,"verified":false,"mode":"mock"}
# In live mode (valid sig): {"received":true,"verified":true}
# In live mode (bad sig): 401 {"error":"INVALID_SIGNATURE"}
```

## Unit Tests

See `apps/api/test/integration/webhook-signature.test.ts`:
- Valid signature accepted
- Invalid signature rejected
- Wrong secret rejected
- Wrong body rejected
- Wrong timestamp rejected
- Missing signature rejected (empty string returns false)
- Missing timestamp rejected
- String vs object body equivalence
- Wrong-length signature rejected

## Security Notes

- **Timing-safe comparison:** `timingSafeEqual` prevents timing attacks on the signature
- **Timestamp in payload:** Prevents replay attacks — sign with timestamp to prevent replay
- **Mock mode accepts unsigned:** Only acceptable because it's development-only; `PULO_FARCASTER_MODE=live` rejects unsigned
- **`/api/webhook/test` endpoint:** Only available when `NODE_ENV != production`