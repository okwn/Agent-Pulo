# DOKPLOY Deployment Guide

Deploy PULO to [Dokploy](https://www.dokploy.com/), a self-hosted Heroku/Netlify alternative.

## Overview

Dokploy provides:
- Docker-based deployments
- Automatic HTTPS with Let's Encrypt
- Git-based CI/CD
- Domain management
- Database management (Postgres, Redis, MySQL, MongoDB)
- Reverse proxy with Nginx

## Step 1: Server Setup

1. Create a Dokploy server (Ubuntu 22.04)
2. Add your domain in Dokploy dashboard
3. Create a project for PULO

## Step 2: Create Project

In Dokploy dashboard:

1. **New Project** → Name: `pulo`
2. **New Server** → Select your server
3. **New Application**:
   - Name: `pulo-api`
   - Type: `Backend`
   - Repository: your-pulo-repo
   - Build Method: `docker compose`

## Step 3: Configure Environment

In Dokploy, go to **Environment** tab and add:

### Required Variables

```bash
# Service
PULO_SERVICE_NAME=pulo
NODE_ENV=production

# Mode (live for production)
PULO_FARCASTER_MODE=live

# Database
DATABASE_URL=postgresql://pulo:YOUR_STRONG_PASSWORD@host:5432/pulo

# Redis
REDIS_URL=redis://host:6379

# Neynar (REAL keys required for live mode)
NEYNAR_API_KEY=your_real_key
NEYNAR_WEBHOOK_SECRET=your_webhook_secret

# LLM Providers (REAL keys required)
OPENAI_API_KEY=sk-your-real-key
ANTHROPIC_API_KEY=sk-ant-your-real-key

# Rate Limiting
RATE_LIMIT_PER_MINUTE=120

# CORS
ALLOWED_ORIGINS=https://your-domain.com
```

### Build Environment (for Docker build)

```bash
# Add these if building from Dockerfile
NEYNAR_API_KEY=your_real_key
NEYNAR_WEBHOOK_SECRET=your_webhook_secret
```

## Step 4: Configure Database

1. Go to **Databases** → **New Database**
2. Type: `PostgreSQL`
3. Name: `pulo`
4. Click **Save and Deploy**

Wait for Postgres to be ready, then note the connection details.

Update `DATABASE_URL` with the actual host/port.

## Step 5: Configure Redis

1. Go to **Databases** → **New Database**
2. Type: `Redis`
3. Name: `pulo-redis`
4. **Save and Deploy**

## Step 6: Configure Build

In your application settings:

### Build Command
```bash
docker compose build
```

### Run Command
```bash
docker compose up -d
```

### Port Mapping
```
4311:4311
```

## Step 7: Configure Domains

1. Go to **Domains** → **New Domain**
2. Add: `api.your-domain.com`
3. SSL: Enable (Let's Encrypt)
4. Proxy: `http://localhost:4311`

## Step 8: Configure Webhook

For Far caster webhooks, you need a public URL:

1. Add domain: `webhook.your-domain.com`
2. Point to: `http://localhost:4311`
3. Configure in Neynar dashboard:
   ```
   https://webhook.your-domain.com/api/webhook/farcaster
   ```

## Step 9: Health Checks

Dokploy supports health check configuration:

```bash
# Health Check Path
/health

# Initial Delay
10

# Interval
30

# Timeout
5
```

## Step 10: Deploy

Click **Deploy** in Dokploy dashboard.

Monitor build logs for any errors.

## Monitoring

### Container Logs

View in Dokploy dashboard under **Logs** tab.

### Performance

Monitor in **Metrics** tab:
- CPU usage
- Memory usage
- Network I/O

## Troubleshooting

### Container fails to start

Check logs for:
- Missing environment variables
- Database connection errors
- Port conflicts

### 502 Bad Gateway

The container started but the proxy can't reach it. Check:
- Application port (should be 4311)
- Health check passing

### Database migration fails

Run manually:
```bash
docker compose exec api pnpm db:migrate
```

## Updating

1. Push to git
2. Dokploy auto-builds on new commit
3. Or click **Redeploy** in dashboard

## Backup Configuration

In Dokploy database settings:
1. Enable **Auto Backup**
2. Set retention period (e.g., 7 days)
3. Set backup schedule (e.g., daily at 2 AM UTC)
