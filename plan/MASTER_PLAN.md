# MASTER_PLAN.md

## Product Vision

PULO is a managed AI intelligence agent on Far, designed to help power users navigate the noise: separating truth from misinformation, tracking emerging trends before they go viral, and automating repetitive social tasks without sacrificing safety or trust.

The product sits at the intersection of a personal AI assistant and a social intelligence layer — surfacing what matters and suppressing what doesn't, one cast at a time.

## Core Surfaces

1. **Pulo Bot** — @pulo mention bot for real-time reply, analysis, and alerts
2. **Mini App / Web Dashboard** — Preference management, usage stats, alert configuration
3. **Admin Panel** — Observability, user management, system health, content moderation

## Agent Capabilities

| Capability | Description |
|---|---|
| Reply Assistant | Generate context-aware replies to any Far cast |
| Truth/Risk Analysis | Score claim accuracy, flag misinformation risk |
| Trend Radar | Detect airdrop, grant, reward, token, and program announcements |
| User Alerts | Configurable thresholds for alert delivery via DM or Cast |
| Thread Summarizer | Summarize long threads into digestible bullets |
| Spam/Abuse Detection | Flag harmful, spam, or abusive content |
| Content Classification | Topic tagging, sentiment, entity extraction |

## Safety Model

- **Zero trust by default** — Every external input is validated and sanitized
- **Rate limiting** — Per-user and per-IP limits prevent abuse
- **Content moderation** — Blocked words, spam patterns, and user-level blocks
- **No mass DM** — Direct casts only to opted-in users; no unsolicited DMs
- **Human-in-the-loop** — Admin overrides for any automated action
- **Audit log** — Every action is logged for review and compliance

## Subscription Model

| Tier | Price | Rate Limits | Features |
|---|---|---|---|
| Free | $0 | 50 casts/day | Basic reply, truth check |
| Pro | $9/mo | 500 casts/day | Trend radar, alerts, thread summarizer |
| Team | $29/mo | Unlimited | Admin panel, team config, API access |

## Architecture Phases

### Phase 0 — Discovery (Current)
Internal planning, spec writing, architecture design, folder scaffolding

### Phase 1 — MVP
Minimal viable bot: mention response, basic reply, truth check, health endpoints

### Phase 2 — Worker & Queue
Redis-backed job queue, background worker, trend detection

### Phase 3 — Web Dashboard
Next.js dashboard, user preferences, alert config

### Phase 4 — Admin Panel
System metrics, user management, audit logs, content moderation

### Phase 5 — Scale & Observability
Full logging, Sentry, LogDNA, alert routing, SLA tracking

### Phase 6 — Multi-tenancy / Team
Multi-user, team management, API keys, billing

## MVP Definition

- [ ] Bot responds to @pulo mentions in under 5 seconds
- [ ] Truth analysis returns a score between 0–1 with supporting context
- [ ] Trend radar detects and alerts on airdrop/grant keywords
- [ ] Web dashboard shows basic usage stats
- [ ] Worker health endpoint returns 200
- [ ] No secrets in git, all env vars externalized
- [ ] Port discovery works without manual assignment

## Future Roadmap

- [ ] Far Mini App entry point (Web QR code)
- [ ] Third-party plugin API
- [ ] Integration with Dune, Nansen, Zora
- [ ] Image/video analysis for multimodal content
- [ ] Multi-language support
- [ ] Community leaderboards / influence scores