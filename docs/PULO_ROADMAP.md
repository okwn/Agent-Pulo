# PULO Roadmap

Planned improvements and future work for PULO.

## Phase 20: Real API Integration

### Real Neynar Integration
- [ ] Wire up actual Neynar API client (currently mocked)
- [ ] Real webhook event processing
- [ ] Real cast creation and posting
- [ ] Real user resolution
- [ ] Real channel tracking

### Real LLM Integration
- [ ] Real OpenAI calls for truth analysis
- [ ] Real web search API (SerpAPI, Tavily, or custom)
- [ ] Streaming responses for long analysis
- [ ] Model selection per task type

### Bot Signer Setup
- [ ] Real Far caster signer UUID configuration
- [ ] Signer key management
- [ ] Bot identity verification

## Phase 21: Data Persistence

### PostgreSQL Full Schema
- [ ] Users table with real auth
- [ ] Alerts table with delivery tracking
- [ ] Truth checks history
- [ ] Audit log persistence
- [ ] Metrics time-series data

### Migration System
- [ ] Flyway or custom migration runner
- [ ] Migration scripts for all tables
- [ ] Seed data management
- [ ] Rollback support

### Backup System
- [ ] Automated daily backups
- [ ] Point-in-time recovery
- [ ] Backup verification tests
- [ ] Cold storage integration

## Phase 22: Real Auth

### User Authentication
- [ ] Far caster OAuth (Sign in with Warpcast)
- [ ] Session management
- [ ] JWT tokens
- [ ] Refresh tokens

### Admin Authentication
- [ ] Real admin role management
- [ ] Permission-based access control
- [ ] Audit trail for auth events

## Phase 23: Payments

### Subscription System
- [ ] Stripe integration
- [ ] Usage tracking (truth checks, alerts)
- [ ] Plan management (free/pro/enterprise)
- [ ] Webhook handling for payment events
- [ ] Invoice generation

### Billing Dashboard
- [ ] Usage meters
- [ ] Billing history
- [ ] Plan upgrade/downgrade
- [ ] Cancellation flow

## Phase 24: Real-Time Features

### WebSocket/SSE
- [ ] Real-time truth check results
- [ ] Trend alerts
- [ ] Admin notifications

### Streaming
- [ ] LLM streaming for analysis
- [ ] Progressive result display
- [ ] Cancel in-flight requests

## Phase 25: Advanced Features

### Trend Prediction
- [ ] ML-based trend velocity prediction
- [ ] Early viral detection
- [ ] Sentiment analysis

### Multi-Language
- [ ] Non-English cast support
- [ ] Translation integration
- [ ] Localized responses

### Image/Video Analysis
- [ ] Screenshot claim analysis
- [ ] Deepfake detection
- [ ] Meme fact-checking

## Phase 26: Operations Scale

### Distributed Architecture
- [ ] Redis-based job queue
- [ ] Multiple worker instances
- [ ] Horizontal scaling
- [ ] Load balancing

### Kubernetes
- [ ] K8s manifests
- [ ] Helm charts
- [ ] Auto-scaling
- [ ] Rolling deployments

### Observability
- [ ] OpenTelemetry integration
- [ ] Distributed tracing
- [ ] Log aggregation (Datadog/LogDNA)
- [ ] Alert rules based on metrics

## Backlog (Unprioritized)

- Email notifications
- SMS notifications
- Slack integration
- Discord integration
- Twitter/X integration
- API rate limit per user
- Feature flags
- A/B testing
- Multi-tenant isolation
- White-label option
- API for third-party developers
- Zapier/Make integration

## Dependencies

Some roadmap items depend on external factors:
- Far caster protocol changes
- Neynar API changes/pricing
- LLM provider availability
- Mini App platform changes
