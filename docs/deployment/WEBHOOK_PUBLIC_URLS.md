# Webhook Public URLs Guide

How to expose PULO's webhook endpoint publicly for Far caster events.

## Overview

PULO receives webhook events from Neynar when:
- A user mentions the PULO bot
- A cast is created with specific keywords
- Mention events occur

For this to work, the API must be publicly accessible and configured in Neynar.

## Architecture

```
Neynar → Internet → Your Server (webhook endpoint)
                    ↓
                PULO API (:4311)
                    ↓
                Worker (processes events)
```

## Option 1: Direct VPS (No Nginx subdomain needed)

### Step 1: Ensure API is publicly accessible

```bash
# Test from local
curl https://your-domain.com/health

# Test from external (use curl ifconfig.me to get your IP)
curl -H "Host: api.your-domain.com" https://your-server-ip/health
```

### Step 2: Configure webhook URL in Neynar

In [Neynar Developer Portal](https://neynar.com/developer):

1. Go to **Webhooks** → **Create Webhook**
2. URL: `https://your-domain.com/api/webhook/farcaster`
3. Subscription Events:
   - `cast.created` (if monitoring keywords)
   - `mention.created` (user mentions the bot)
4. Copy Webhook Signing Secret

### Step 3: Set environment variable

```bash
NEYNAR_WEBHOOK_SECRET=your_webhook_secret_from_neynar
```

### Step 4: Verify webhook is working

```bash
# Check logs
docker compose logs api | grep webhook

# Send test event manually (development only)
curl -X POST https://your-domain.com/api/webhook/farcaster \
  -H "Content-Type: application/json" \
  -H "x-neynar-signature: test" \
  -d '{"type": "mention", "fid": 123, "text": "hello"}'
```

## Option 2: With Nginx (Dedicated subdomain)

### Subdomain: `webhook.your-domain.com`

```bash
# A record in DNS
webhook.your-domain.com → YOUR_SERVER_IP
```

### Nginx config for webhook

```nginx
server {
    listen 80;
    server_name webhook.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # IMPORTANT: Pass through webhook headers
        proxy_set_header X-Neynar-Signature $http_x_neynar_signature;
        proxy_set_header X-Webhook-Timestamp $http_x_webhook_timestamp;
    }
}
```

### HTTPS with Let's Encrypt

```bash
sudo certbot --nginx -d webhook.your-domain.com
```

### Neynar webhook URL

```
https://webhook.your-domain.com/api/webhook/farcaster
```

## Option 3: With reverse proxy (API subdomain)

If API is at `api.your-domain.com`, webhook URL is:

```
https://api.your-domain.com/api/webhook/farcaster
```

Nginx already passes through the headers.

## Security Considerations

### 1. Webhook Signature Verification

PULO verifies webhook signatures in live mode:

```typescript
const isValid = verifyNeynarSignature(body, signature, timestamp, secret);
if (!isValid) {
  return reply.code(401).send({ error: 'INVALID_SIGNATURE' });
}
```

If verification fails, the request is rejected with 401.

### 2. Timestamp Validation

Webhooks older than 5 minutes are rejected (replay attack protection):

```bash
# Check timestamp header
x-webhook-timestamp: 1704067200
```

### 3. IP Allowlisting (Optional)

In Neynar dashboard, you can configure IP allowlisting for webhook sources.

On your server, you can also restrict access:

```nginx
# Allow only Neynar IPs (check Neynar docs for their IPs)
location /api/webhook/ {
    allow 10.0.0.0/8;  # Neynar's IP range (example)
    deny all;

    proxy_pass http://127.0.0.1:4311;
    # ...
}
```

## Testing Webhooks Locally

### Option 1: ngrok (Recommended for dev)

```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Start tunnel to local API
ngrok http 4311

# Note the public URL
# Forwarding: https://abc123.ngrok-free.app -> http://localhost:4311
```

Use `https://abc123.ngrok-free.app/api/webhook/farcaster` in Neynar.

### Option 2: localtunnel

```bash
npx localtunnel --port 4311
```

### Option 3: Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:4311
```

## Verifying Webhook Setup

### 1. Check endpoint is reachable

```bash
curl -v https://webhook.your-domain.com/api/webhook/farcaster
```

Should return 401 (missing signature) or 200.

### 2. Check signature verification

In Neynar, there's usually a "Send test webhook" button.

### 3. Check logs

```bash
# Watch API logs
docker compose logs -f api | grep webhook

# Should see entries like:
# [api] Webhook received: type=mention, fid=123
# [api] Webhook verified: true
```

## Troubleshooting

### "Webhook endpoint not accessible"

1. Check firewall: `sudo ufw status`
2. Check Nginx: `sudo nginx -t`
3. Test locally: `curl localhost:4311/health`
4. Test externally: `curl https://your-domain.com/health`

### "Signature verification failed"

1. Verify `NEYNAR_WEBHOOK_SECRET` is correct
2. Check signature header is being passed through Nginx
3. Check timestamp is recent (within 5 minutes)

### "Events not being received"

1. Verify webhook URL in Neynar dashboard
2. Check subscription events are correct
3. Verify bot is mentioned or keyword triggers are set
4. Check `PULO_FARCASTER_MODE=live` is set

## Debug Mode

Enable verbose webhook logging:

```bash
# In .env
LOG_LEVEL=debug
```

Then watch logs:
```bash
docker compose logs -f api | grep -i webhook
```

## Checklist

- [ ] Server is publicly accessible (HTTPS)
- [ ] `/api/webhook/farcaster` endpoint returns valid response
- [ ] `NEYNAR_WEBHOOK_SECRET` is set
- [ ] `PULO_FARCASTER_MODE=live`
- [ ] Webhook URL configured in Neynar dashboard
- [ ] Subscription events match your use case
- [ ] Signature verification is working
- [ ] Test webhook sends successfully
