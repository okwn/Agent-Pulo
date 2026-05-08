# Coolify Deployment Guide

Deploy PULO to [Coolify](https://coolify.io/), an open-source self-hosted alternative to Vercel/Heroku.

## Overview

Coolify provides:
- One-click deployments from Git
- Automatic HTTPS (Let's Encrypt)
- Database management
- Redis management
- Reverse proxy with Nginx
- Docker-based infrastructure

## Step 1: Server Setup

1. Install Coolify on a server (fresh Ubuntu 22.04 recommended)
2. Access Coolify dashboard at `https://your-server:3000`
3. Add your domain

## Step 2: Create Project

1. **New Project** → Name: `pulo`
2. **Add Resource** → **Application**

## Step 3: Configure Application

### Git Source

Connect your Git repository and select PULO repo.

### Build Configuration

```yaml
# Build Type
Docker Compose

# Dockerfile (optional - can use docker-compose.yml)
```

### Environment Variables

Add in Coolify **Environment Variables** section:

```bash
# Service
PULO_SERVICE_NAME=pulo
NODE_ENV=production
PULO_FARCASTER_MODE=live

# Database
DATABASE_URL=postgresql://pulo:YOUR_PASSWORD@host:5432/pulo

# Redis
REDIS_URL=redis://host:6379

# Neynar (REAL keys required)
NEYNAR_API_KEY=your_real_key
NEYNAR_WEBHOOK_SECRET=your_webhook_secret

# LLM Providers (REAL keys required)
OPENAI_API_KEY=sk-your-real-key
ANTHROPIC_API_KEY=sk-ant-your-real-key

# CORS
ALLOWED_ORIGINS=https://your-domain.com
```

### Port Configuration

```
4311:4311
```

## Step 4: Add Database

1. **New Resource** → **Database** → **PostgreSQL**
2. Name: `pulo-db`
3. Version: 16 (or latest)
4. **Save and Deploy**

Wait for database to be ready. Note the connection details.

## Step 5: Add Redis

1. **New Resource** → **Database** → **Redis**
2. Name: `pulo-redis`
3. **Save and Deploy**

## Step 6: Configure Docker Compose

Coolify will detect `docker-compose.yml`. Ensure it has:

```yaml
services:
  api:
    ports:
      - "4311:4311"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEYNAR_API_KEY=${NEYNAR_API_KEY}
      - NEYNAR_WEBHOOK_SECRET=${NEYNAR_WEBHOOK_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  worker:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEYNAR_API_KEY=${NEYNAR_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=pulo
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=pulo
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

## Step 7: Configure Domain

1. Go to **Domains** tab
2. **Add Domain**
3. Select: `api.your-domain.com`
4. Enable HTTPS (Let's Encrypt)
5. Save

## Step 8: Configure Webhook URL

For Far caster webhooks:

1. Add domain: `webhook.your-domain.com`
2. Point to your API instance
3. Configure in Neynar:
   ```
   https://webhook.your-domain.com/api/webhook/farcaster
   ```

## Step 9: Deploy

Click **Deploy** in Coolify dashboard.

Watch build logs:
- `pnpm install`
- Docker image build
- Database migration

## Step 10: Verify

```bash
# Health check
curl https://api.your-domain.com/health

# Deep health
curl https://api.your-domain.com/health/deep

# Metrics
curl https://api.your-domain.com/metrics
```

## Health Checks in Coolify

Configure in application settings:

```
Health Check: /health
Timeout: 30s
```

## Backup Configuration

In Coolify database settings:
1. Enable **Automated Backups**
2. Set schedule (e.g., daily)
3. Set retention

## Updating

1. Push to Git
2. Coolify detects new commit
3. Auto-deploys OR click **Deploy**

## Troubleshooting

### "Cannot connect to database"

1. Check DATABASE_URL format
2. Verify Postgres is running
3. Check network connectivity

### "Build failed"

Check build logs for:
- Missing environment variables
- Build argument errors
- npm install failures

### "Application unhealthy"

The app started but health check failed:
1. Check `/health` endpoint works locally
2. Verify port mapping
3. Check logs

## Production Checklist

- [ ] Real Neynar API key configured
- [ ] Real OpenAI/Anthropic keys configured
- [ ] DATABASE_URL points to managed database
- [ ] REDIS_URL points to managed Redis
- [ ] ALLOWED_ORIGINS set to your domain
- [ ] SSL enabled
- [ ] Health check configured
- [ ] Backups enabled
