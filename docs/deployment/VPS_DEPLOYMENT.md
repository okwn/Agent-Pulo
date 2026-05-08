# VPS Deployment Guide

Deploy PULO to a self-hosted VPS with Docker.

## Prerequisites

- VPS with 2+ CPU cores, 4GB+ RAM
- Ubuntu 22.04 LTS (or similar)
- Docker + Docker Compose
- Domain name pointed to server IP
- SSL certificates (Let's Encrypt recommended)

## Architecture

```
Internet → Nginx (443) → API (:4311)
                             ↓
                         Worker
                             ↓
                       Postgres + Redis
```

## Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 2: Directory Setup

```bash
# Create app directory
mkdir -p /opt/pulo
cd /opt/pulo

# Clone or copy project
# (if using git)
git clone https://github.com/your-org/pulo.git .
```

## Step 3: Environment Configuration

```bash
# Create production .env
cat > .env << 'EOF'
# PULO Service Name
PULO_SERVICE_NAME=pulo

# Modes
NODE_ENV=production
PULO_FARCASTER_MODE=live

# API Server
API_PORT=4311
ALLOWED_ORIGINS=https://your-domain.com

# Database
DATABASE_URL=postgresql://pulo:CHANGE_ME@localhost:5432/pulo
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=pulo
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=pulo

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Neynar (required for live mode)
NEYNAR_API_KEY=your_real_neynar_key
NEYNAR_WEBHOOK_SECRET=your_webhook_secret

# LLM Providers (required for live mode)
OPENAI_API_KEY=sk-your-real-key
ANTHROPIC_API_KEY=sk-ant-your-real-key

# Rate Limiting
RATE_LIMIT_PER_MINUTE=120

# Security
BODY_SIZE_LIMIT=1048576
EOF

chmod 600 .env
```

## Step 4: Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create site config
sudo cat > /etc/nginx/sites-available/pulo << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/webhook/ {
        proxy_pass http://127.0.0.1:4311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/pulo /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com
```

## Step 6: Database Initialization

```bash
# Start postgres first
docker compose up -d postgres redis

# Wait for postgres
sleep 5

# Run migrations
docker compose run --rm api pnpm db:migrate
```

## Step 7: Start Services

```bash
# Pull latest images or build
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps
```

## Step 8: Health Verification

```bash
# Check API health
curl https://your-domain.com/health

# Check deep health
curl https://your-domain.com/health/deep

# Check metrics
curl https://your-domain.com/metrics
```

## Monitoring

### View Logs

```bash
docker compose logs -f api
docker compose logs -f worker
```

### Restart

```bash
docker compose restart api worker
```

### Update

```bash
git pull
docker compose build
docker compose up -d
```

## Backup Setup

See [POSTGRES_BACKUP.md](./POSTGRES_BACKUP.md) for database backup configuration.

## Security Checklist

- [ ] `.env` file has strong passwords (min 32 chars)
- [ ] `NODE_ENV=production` is set
- [ ] `PULO_FARCASTER_MODE=live` in production
- [ ] Real API keys (no PLACEHOLDER values)
- [ ] Nginx SSL enabled (HTTPS only)
- [ ] Firewall allows only 22, 80, 443
- [ ] Postgres password changed from default
- [ ] Rate limiting configured
- [ ] Backups configured and tested

## Troubleshooting

### API returns 502

Check if API is running:
```bash
docker compose ps api
docker compose logs api
```

### Database connection failed

```bash
docker compose exec postgres psql -U pulo -d pulo -c "SELECT 1"
```

### Webhook not receiving events

1. Verify webhook URL is publicly accessible
2. Check Neynar webhook signature matches
3. Check `NEYNAR_WEBHOOK_SECRET` is correct
