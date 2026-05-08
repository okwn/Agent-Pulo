# PULO Known Limitations

## Database & Persistence

1. **No real Postgres** — All data stores are in-memory. On restart, data is lost.
2. **No migrations** — Schema files exist but no migration runner applies them.
3. **No backup** — In-memory stores cannot be backed up (nothing to back up).
4. **No read replica** — Single-node only, no scaling.
5. **Metrics reset on restart** — In-memory metrics store clears on restart.

## API Integration (Mocked)

6. **Neynar API is mocked** — All API calls return demo data. No real Far caster API calls.
7. **Webhook verification is mocked** — `PULO_FARCASTER_MODE=mock` skips signature verification.
8. **LLM calls return canned responses** — No real OpenAI/Anthropic calls.
9. **Web search returns mock results** — No real search API calls.
10. **Cast creation is stubbed** — Posts to console log, not real Far caster.
11. **Mini App notifications are stubbed** — Logs notification, doesn't send.

## Authentication

12. **No real OAuth** — Demo cookie auth only (FID 1 is admin).
13. **No JWT for API** — Sessions are cookie-based demo tokens only.
14. **Admin access is FID-based** — No role-based permissions system.
15. **No multi-user support** — Demo mode supports one demo user.

## Payments & Billing

16. **Stripe not integrated** — No real payment processing.
17. **Plan limits are mock** — "Unlimited" is in-memory counter only.
18. **No billing dashboard** — Cannot view invoices or payment history.

## Worker & Queue

19. **In-memory job queue** — No Redis-based distributed queue.
20. **No job prioritization** — All jobs processed FIFO.
21. **No scheduled jobs** — No cron-like job scheduling.
22. **No job timeout enforcement** — Jobs run until completion.

## Observability

23. **No distributed tracing** — OpenTelemetry is not wired.
24. **Logs go to stdout only** — No log aggregation (LogDNA/Datadog).
25. **Sentry DSN is configurable but not integrated** — Errors not sent to Sentry.
26. **No alert rules** — No alerting based on metrics thresholds.

## Security

27. **No database encryption at rest** — Postgres data is unencrypted.
28. **No real secret manager** — Secrets in env vars only.
29. **No IP allowlisting** — Any IP can attempt webhooks.
30. **No CAPTCHA** — Unauthenticated endpoints vulnerable to bots.

## Deployment

31. **No Kubernetes manifests** — Docker Compose only.
32. **No Helm charts** — Not Kubernetes-ready.
33. **No Terraform/IaC** — Manual server setup required.
34. **No CDN configuration** — Static assets served from app server.
35. **No email notifications** — Only Far caster cast notifications.

## Feature Gaps

36. **No WebSocket/SSE** — No real-time updates.
37. **No streaming responses** — LLM responses are batched.
38. **No multi-language** — English only.
39. **No image/video analysis** — Text-only claim analysis.
40. **No trend prediction ML** — Simple velocity-based trends only.

## Testing

41. **No E2E tests** — Only unit tests.
42. **No load tests** — No performance benchmarks.
43. **No integration tests with real APIs** — All mocked.

## Documentation

44. **No API changelog** — Version history not maintained.
45. **No migration guide** — Upgrading from v0 to v1 not documented.

## Operational

46. **No canary deployments** — All-or-nothing deploys.
47. **No feature flags** — No way to toggle features.
48. **No A/B testing** — No experimentation framework.
49. **No multi-tenant isolation** — Shared resources.

## Dependencies

50. **Docker Compose health checks are mocked** — Containers marked healthy without actual checks.
51. **Redis connected but not used** — Queue and cache use in-memory stores.

## Summary

PULO is a **local development mock** that demonstrates the architecture and core features. It is not production-ready without:

1. Real API keys (Neynar, OpenAI)
2. Real Postgres database
3. Real Redis queue
4. Real auth (OAuth)
5. Real payment (Stripe)
6. Real webhook endpoint (public URL)
7. Bot signer (Warpcast)
8. Mini App setup

Until these are configured, the system runs entirely in memory with mocked responses.
