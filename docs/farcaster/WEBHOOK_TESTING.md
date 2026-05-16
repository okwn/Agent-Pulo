# Far caster Webhook Testing

## Testing Webhooks Locally

### Mock Mode (No Keys Required)

```bash
# Start API in mock mode
pnpm dev:api
```

Mock mode accepts all incoming webhooks without signature verification:

```bash
# Send a test mention
curl -X POST http://localhost:4311/api/webhook/farcaster \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mention",
    "data": { "cast": { "author": { "fid": 1 }, "text": "Hey @pulo_bot" } }
  }'
```

### Test Webhook Route

```bash
curl -X POST http://localhost:4311/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"type": "mention", "fid": 1, "text": "test mention"}'
```

### Admin Mock Routes

```bash
# Inject a mock mention event
curl -X POST http://localhost:4311/api/admin/mock/farcaster/mention \
  -H "Content-Type: application/json" \
  -d '{"fid": 1, "text": "What do you think about this airdrop?"}'

# Get mock thread
curl -X POST http://localhost:4311/api/admin/mock/farcaster/thread \
  -H "Content-Type: application/json" \
  -d '{"castHash": "mock-cast-001"}'

# Test mock reply (with rate limit simulation)
curl -X POST http://localhost:4311/api/admin/mock/farcaster/reply \
  -H "Content-Type: application/json" \
  -d '{"parentHash": "mock-cast-001", "text": "Great post!"}'

# Simulate rate limit
curl -X POST http://localhost:4311/api/admin/mock/farcaster/reply \
  -H "Content-Type: application/json" \
  -d '{"simulateRateLimit": true}'
```

## Mock Rate Limiting

```bash
# Enable rate limiting (5 casts until limit)
curl -X POST http://localhost:4311/api/admin/mock/farcaster/rate-limit \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "castsUntilRateLimit": 5}'

# Check state
curl http://localhost:4311/api/admin/mock/farcaster/state

# Clear state
curl -X POST http://localhost:4311/api/admin/mock/farcaster/clear
```

## Live Webhook Setup

When ready to test with live Neynar:

1. Run `pnpm farcaster:check` to verify all keys are set
2. Configure your webhook URL in Neynar dashboard:
   ```
   https://your-domain.com/api/webhook/farcaster
   ```
3. Set `NEYNAR_WEBHOOK_SECRET` to the secret shown in Neynar dashboard
4. Switch to live mode: `PULO_FARCASTER_MODE=live`
5. Watch logs: `pnpm docker:logs -f api`

## Verifying Signature Locally

```bash
# Generate expected signature
TIMESTAMP=$(date +%s)
BODY='{"type":"mention","data":{}}'
SECRET="your-webhook-secret"
EXPECTED=$(echo -n "${TIMESTAMP}${BODY}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -X POST http://localhost:4311/api/webhook/farcaster \
  -H "Content-Type: application/json" \
  -H "x-neynar-signature: $EXPECTED" \
  -H "x-webhook-timestamp: $TIMESTAMP" \
  -d "$BODY"
```