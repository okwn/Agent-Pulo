# Nginx Reverse Proxy Guide

Configure Nginx as a reverse proxy for PULO.

## Basic Configuration

### Single Service (API only)

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    # For health checks from same machine
    location /health {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### HTTPS with SSL

```nginx
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
```

### API + Web (Split by path)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location /metrics {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location /health {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location / {
        proxy_pass http://127.0.0.1:4310;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
```

### Webhook Path (Dedicated subdomain)

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
        proxy_set_header X-Webhook-Timestamp $http_x_webhook_timestamp;
        proxy_set_header X-Neynar-Signature $http_x_neynar_signature;
    }
}
```

## Rate Limiting in Nginx

Add before `server` block:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=120r/m;
```

Add to location block:

```nginx
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://127.0.0.1:4311;
    # ...
}
```

## Security Headers

Add to server block:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## WebSocket Support (if needed)

```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:4311;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400;
}
```

## Timeouts

For long-running requests:

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

## Buffering

Disable buffering for streaming responses:

```nginx
proxy_buffering off;
proxy_cache off;
```

## Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renew
sudo certbot renew --dry-run
```

## Full Example with Everything

```nginx
# Rate limit zone
limit_req_zone $binary_remote_addr zone=pulo_api:10m rate=120r/m;

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API proxy
    location /api/ {
        limit_req zone=pulo_api burst=20 nodelay;
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Metrics (allow monitoring)
    location /metrics {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Health (allow monitoring)
    location /health {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Webhook (special handling)
    location /api/webhook/ {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Pass webhook headers through
        proxy_set_header X-Neynar-Signature $http_x_neynar_signature;
        proxy_set_header X-Webhook-Timestamp $http_x_webhook_timestamp;
    }
}
```

## Troubleshooting

### 502 Bad Gateway

Nginx can't reach the backend:
1. Check API is running: `curl localhost:4311/health`
2. Check proxy_pass address
3. Check firewalls

### 504 Gateway Timeout

```nginx
proxy_connect_timeout 120s;
proxy_send_timeout 120s;
proxy_read_timeout 120s;
```

### Connection refused on socket

If API uses Unix socket:
```nginx
location / {
    proxy_pass http://unix:/var/run/pulo.sock;
    # ...
}
```
