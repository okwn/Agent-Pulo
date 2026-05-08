# PULO Next Steps

Top 10 improvements to make PULO production-ready.

## Priority 1: Real API Integration

### 1. Wire Neynar API Client
- [ ] Replace mock responses with real `axios` calls to Neynar
- [ ] Fetch actual cast data for truth analysis
- [ ] Post real casts via bot signer
- [ ] Test webhook delivery with real Neynar account

### 2. Wire OpenAI API Client
- [ ] Replace mock LLM with real `openai` SDK calls
- [ ] Implement streaming for long responses
- [ ] Add cost tracking
- [ ] Configure model fallback (GPT-4 → GPT-3.5)

### 3. Configure Bot Signer
- [ ] Get real signer UUID from Warpcast
- [ ] Store in `NEYNAR_SIGNER_UUID`
- [ ] Verify bot can post in sandbox first
- [ ] Test mention → reply flow end-to-end

## Priority 2: Real Persistence

### 4. Postgres Integration
- [ ] Set up real Postgres (not Docker volume)
- [ ] Write and run migrations
- [ ] Replace in-memory stores with DB queries
- [ ] Add connection pooling
- [ ] Enable SSL for connections

### 5. Redis Queue
- [ ] Implement Redis-based job queue
- [ ] Move from in-memory to Bull/BullMQ
- [ ] Add job prioritization
- [ ] Configure dead letter queue in Redis
- [ ] Add worker scaling

### 6. Backup System
- [ ] Configure automated Postgres backups
- [ ] Set up WAL archiving
- [ ] Test restore procedure
- [ ] Document recovery steps

## Priority 3: Real Auth

### 7. Far caster OAuth
- [ ] Implement Sign in with Warpcast
- [ ] Replace demo cookie with JWT
- [ ] Add refresh tokens
- [ ] Implement session management
- [ ] Add logout functionality

### 8. Admin RBAC
- [ ] Replace FID-based admin check with role system
- [ ] Add permission checks to all admin routes
- [ ] Audit log all auth events
- [ ] Add IP-based admin restrictions

## Priority 4: Production Infrastructure

### 9. Monitoring & Alerting
- [ ] Wire Sentry for error tracking
- [ ] Configure Prometheus alerts
- [ ] Set up log aggregation (LogDNA)
- [ ] Add health check monitoring (UptimeRobot)
- [ ] Create runbooks for common failures

### 10. Payment Integration
- [ ] Integrate Stripe
- [ ] Implement subscription plans
- [ ] Add usage metering
- [ ] Handle webhook events
- [ ] Create billing dashboard

## Non-Prioritized Backlog

- Kubernetes deployment manifests
- Terraform infrastructure code
- Multi-language support
- Image/video analysis
- Trend prediction ML
- WebSocket real-time updates
- Multi-tenant isolation
- White-label option
- Third-party API
- Zapier integration

## Getting to Production

Path from current state to production:

```
Current: READY_LOCAL_MOCK
         ↓ (requires all 4 steps below)
Target: READY_LIVE_WITH_KEYS
         ↓ (requires all 7 steps below)
Final: PRODUCTION
```

### Step 1: Get Real Keys (1 day)
1. Get Neynar API key
2. Get OpenAI API key
3. Get Far caster bot signer

### Step 2: Configure Environment (1 day)
1. Set `PULO_FARCASTER_MODE=live`
2. Set all required env vars
3. Test webhook endpoint publicly
4. Verify bot can post

### Step 3: Real Persistence (3 days)
1. Provision managed Postgres
2. Run migrations
3. Move data stores to DB
4. Set up Redis
5. Configure backups

### Step 4: Real Auth (3 days)
1. Implement OAuth
2. Wire JWT
3. Add admin RBAC
4. Test all flows

## Cost Estimate (Monthly)

| Service | Cost |
|---------|------|
| Managed Postgres (e.g., Supabase, Neon) | $0-25 |
| Managed Redis (e.g., Upstash) | $0-10 |
| Neynar API | $0-50 (free tier available) |
| OpenAI | $0-50 (depending on usage) |
| VPS/Dokploy server | $10-50 |
| Domain + SSL | $10-15 |
| Monitoring | $0-20 |
| **Total** | **$20-220/month** |

## Risk Mitigation

Before going live, address:
- [ ] Secret manager (not env vars in code)
- [ ] Database encryption at rest
- [ ] Webhook IP allowlisting
- [ ] Rate limit per user
- [ ] Cost alerts for API usage
- [ ] Backup tested and documented
- [ ] Runbook for common failures
