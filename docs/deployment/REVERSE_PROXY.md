# REVERSE_PROXY.md — Reverse Proxy Configuration for PULO

## Overview

PULO requires a reverse proxy for:
- HTTPS/TLS termination (Let's Encrypt)
- Routing `/api/*` → API, `/*` → Web
- Security headers on all responses
- Long timeout for AI/LLM webhook operations (60-300s)

## Option 1: Caddy (Recommended)

Caddy handles HTTPS automatically and has the simplest configuration.

### Install

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/deb.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Configuration

Copy the example:
```bash
sudo cp infra/reverse-proxy/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile
# Replace pulo.example.com with your domain
```

Key settings in Caddyfile:
- **Long timeouts**: `response_timeout 300s` for AI operations
- **Security headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Websocket**: keepalive for real-time features
- **Gzip/Zstd**: compress text, JSON, JS, CSS

### Start

```bash
sudo systemctl enable --now caddy
sudo caddy fmt /etc/caddy/Caddyfile --overwrite
sudo systemctl reload caddy
```

## Option 2: Nginx

If you prefer Nginx, use this configuration:

```nginx
# /etc/nginx/sites-available/pulo
upstream pulo_api {
    server 127.0.0.1:4311;
    keepalive 64;
}

upstream pulo_web {
    server 127.0.0.1:3100;
    keepalive 32;
}

server {
    listen 80;
    server_name pulo.example.com;

    # Security headers
    add_header X-Frame-Options          "DENY"                    always;
    add_header X-Content-Type-Options   "nosniff"                 always;
    add_header X-XSS-Protection         "1; mode=block"           always;
    add_header Referrer-Policy          "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy       "camera=(), microphone=(), geolocation=()" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location /api/ {
        proxy_pass http://pulo_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;  # Long timeout for AI/LLM calls
        proxy_connect_timeout 10s;
    }

    location /api/webhook/ {
        proxy_pass http://pulo_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_read_timeout 120s;
    }

    location / {
        proxy_pass http://pulo_web;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/pulo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Option 3: Cloudflare Tunnel (No Server Required)

For zero infrastructure setup:

1. Create Cloudflare account + zone for your domain
2. Download cloudflared: `curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared`
3. Authenticate: `cloudflared tunnel login`
4. Create tunnel: `cloudflared tunnel create pulo`
5. Route:
```bash
cloudflared tunnel route dns pulo pulo.example.com
cloudflared tunnel route dns pulo api.pulo.example.com
```
6. Run:
```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: pulo.example.com
    service: http://localhost:3100
  - hostname: api.pulo.example.com
    service: http://localhost:4311
  - service: http_status:404
```

## Security Considerations

- **Always use HTTPS** in production
- **Long timeouts are required** for AI operations — do NOT set to default 30s
- **Rate limiting**: Add at reverse proxy level for `/api/auth/*` and `/api/webhook/*` endpoints
- **DDoS protection**: Cloudflare or similar CDN recommended for production
- **Keepalive**: Enable for WebSocket/streaming support

## Testing

```bash
# Check headers
curl -I https://pulo.example.com

# Verify API proxy
curl https://api.pulo.example.com/health

# Check webhook endpoint
curl -X POST https://api.pulo.example.com/api/webhook/farcaster \
  -H "Content-Type: application/json" \
  -d '{"type":"mention","fid":100,"castHash":"test"}'
```