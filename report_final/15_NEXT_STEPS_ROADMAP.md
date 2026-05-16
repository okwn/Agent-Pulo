# 15_NEXT_STEPS_ROADMAP.md

## Status: 📋 PLANNED — Priority Order for Production Launch

## Immediate (Before First Live Key Test)

These must be resolved before any live API key touches the system:

| Priority | Item | File | Effort |
|----------|------|------|--------|
| P0 | Set `DEMO_AUTH_SECRET` to a strong random value | `.env` | 1 min |
| P0 | Add `restart: unless-stopped` to docker-compose.yml services | `docker-compose.yml` | 2 min |
| P1 | Implement SIWF auth (Sign In With Far caster) | `packages/auth/src/index.ts` | 2–4 weeks |
| P1 | Set `PULO_BUDGET_STORAGE=redis` for daily budget persistence | `.env` | 5 min |
| P1 | Verify Neynar API key is valid | neynar.com | 5 min |
| P2 | Implement webhook HMAC signature verification | `apps/api/src/routes/webhook.ts` | 1 day |
| P2 | Add Redis-backed rate limit store | `apps/api/src/middleware/security.ts` | 1 day |
| P2 | Add pagination controls to admin DataTable components | `apps/web/src/components/admin/` | 1 day |

## Pre-Production (After First Live Key Test Passes)

| Priority | Item | Effort |
|----------|------|--------|
| P1 | Configure production `ALLOWED_ORIGINS` | 5 min |
| P1 | Schedule automated DB backup via cron | 10 min |
| P2 | Set up log aggregation (Datadog/Elasticsearch) | 1 day |
| P2 | Add load testing with k6 or artillery | 1 day |
| P3 | Add axe-core accessibility testing to CI | 1 day |
| P3 | E2E tests for admin resolve/dismiss actions | 1 day |
| P3 | Performance profiling: LCP/INP/CLS on web Vitals | 1 day |

## Post-Launch (Nice to Have)

| Item | Effort |
|------|--------|
| SIWF full OAuth flow with Neynar | 2–3 weeks |
| Warpcast notification provider (real push) | 1 week |
| Multi-tenant / white-label support | 2 weeks |
| Advanced analytics dashboard | 1 week |
| A/B testing for prompt variants | 1 week |

## Monitoring and Observability

After launch, monitor these critical signals:

```bash
# Key metrics to watch
curl http://localhost:4311/metrics  # Prometheus-format metrics

# Critical alerts to set up:
# - API error rate > 1%
# - LLM cost per day exceeding budget
# - Rate limit rejections > 100/hour
# - Safety blocks > 50/hour
# - DB connection pool exhaustion
```

## Architecture Extensibility

PULO is designed to be extended in these natural directions:

### Adding a New LLM Provider
```typescript
// packages/llm/src/providers/new-provider.ts
export class NewProvider implements LLMProvider {
  async complete(prompt: string, opts: CompletionOptions): Promise<CompletionResult> {
    // Implement
  }
}

// packages/llm/src/index.ts — add to createForMode()
```

### Adding a New Social Platform
```typescript
// packages/social/src/adapter.ts
export interface SocialAdapter {
  getCast(castHash: string): Promise<Cast>;
  getUserTimeline(fid: number): Promise<Cast[]>;
  sendCast(text: string): Promise<void>;
}
// Implement for Lens, Twitter, etc.
```

### Adding a New Alert Channel
```typescript
// packages/notifications/src/channels/telegram.ts
export class TelegramChannel implements AlertChannel {
  async send(alert: Alert): Promise<void> { ... }
}
// Add to AlertManager in packages/notifications/src/
```

---

## Final Verdict Summary

| Dimension | Status |
|-----------|--------|
| **Code** | ✅ Clean, type-safe, linted |
| **Tests** | ✅ 45 unit/integration passing, E2E configured |
| **Build** | ✅ All packages and apps build successfully |
| **Admin Panel** | ✅ 12 admin pages fully wired |
| **LLM Layer** | ✅ Mock ready, OpenAI/Anthropic/Auto-fallback ready |
| **Safety** | ✅ Gate with configurable thresholds |
| **Database** | ✅ Prisma schema complete, migrations ready |
| **Docker** | ✅ 4-service compose with health checks |
| **CI** | ✅ GitHub Actions pipeline (no live keys needed) |
| **Security** | ⚠️ Demo auth working, SIWF stub |
| **Tech Debt** | ⚠️ Redis budget not default, in-memory rate limits |

### Overall Verdict: **READY_WITH_LIMITATIONS**

Core platform is fully functional. Production launch requires:
1. **SIWF auth implementation** (P0 — required for real users)
2. **Live key validation** (P1 — follow test plan in report 14)
3. **Redis budget activation** (P1 — prevents daily budget reset abuse)

All limitations are documented in this report series. Mock mode is stable and testable immediately.

---

## Quick Links to All 15 Reports

| Report | File |
|--------|------|
| 01 Executive Summary | `report_final/01_EXECUTIVE_SUMMARY.md` |
| 02 Architecture Map | `report_final/02_ARCHITECTURE_MAP.md` |
| 03 Far caster Live Readiness | `report_final/03_FARCASTER_LIVE_READINESS.md` |
| 04 Truth Analysis Status | `report_final/04_TRUTH_ANALYSIS_STATUS.md` |
| 05 Radar Alerting Status | `report_final/05_RADAR_ALERTING_STATUS.md` |
| 06 Safety Limits Status | `report_final/06_SAFETY_LIMITS_STATUS.md` |
| 07 LLM Provider Status | `report_final/07_LLM_PROVIDER_STATUS.md` |
| 08 Database Status | `report_final/08_DATABASE_STATUS.md` |
| 09 Frontend Admin Status | `report_final/09_FRONTEND_ADMIN_STATUS.md` |
| 10 DevOps Deployment Status | `report_final/10_DEVOPS_DEPLOYMENT_STATUS.md` |
| 11 Testing Validation Status | `report_final/11_TESTING_VALIDATION_STATUS.md` |
| 12 Security Review | `report_final/12_SECURITY_REVIEW.md` |
| 13 Technical Debt | `report_final/13_TECHNICAL_DEBT.md` |
| 14 Live API Key Test Plan | `report_final/14_LIVE_API_KEY_TEST_PLAN.md` |
| 15 Next Steps Roadmap | `this file` |