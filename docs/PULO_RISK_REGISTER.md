# PULO Risk Register

Identified risks and mitigations for PULO.

## Technical Risks

### CRITICAL

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Neynar API key exposed** | Low | Critical | Never expose in frontend, use server-side only, rotate if leaked |
| **Webhook signature bypass** | Low | Critical | Always verify in live mode, reject if signature invalid |
| **Private key/signer UUID leaked** | Low | Critical | Secret scanner, .gitignore, never log sensitive data |
| **SQL injection** | Low | Critical | Use parameterized queries, Zod validation on all inputs |
| **Bot posts malicious content** | Low | Critical | Safety analysis before any post, admin approval for auto-reply |

### HIGH

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Rate limit abuse** | Medium | High | Per-IP rate limiting, user quotas, global limits |
| **Database connection exhaustion** | Low | High | Connection pooling, timeout limits, health checks |
| **LLM API costs runaway** | Medium | High | Token limits, per-user quotas, cost monitoring |
| **Memory leak in worker** | Medium | High | Worker restart cycles, memory monitoring |
| **Webhook replay attacks** | Low | High | Timestamp validation, idempotency checks |

### MEDIUM

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **CORS misconfiguration** | Low | Medium | Explicit origin lists, no wildcards in production |
| **URL safety false negatives** | Medium | Medium | Regular pattern updates, user reports, manual override |
| **Metrics store OOM** | Low | Medium | Max metrics entries, memory limits, Prometheus export |
| **Audit log overflow** | Low | Medium | Max 10,000 entries in-memory, rotation policy |
| **Job queue backup** | Low | Medium | Dead letter queue, retry limits, monitoring |

### LOW

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Port conflicts in dev** | Medium | Low | Automatic port detection and fallback |
| **Circular dependency in logs** | Low | Low | Lazy initialization pattern, module-level tests |
| **Timezone issues in timestamps** | Low | Low | Always use ISO 8601, UTC internally |
| **Encoding issues** | Low | Low | UTF-8 everywhere, normalize inputs |

## Operational Risks

### HIGH

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Data loss (no backups)** | Low | High | Implement automated backups ASAP |
| **Service downtime** | Medium | High | Health checks, monitoring, restart policies |
| **Keys rotation without update path** | Low | High | Document rotation procedure, env var support |
| **Team member departure** | Low | High | Documentation, code review, no bus factor |

### MEDIUM

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Credential sharing in team** | Medium | Medium | Use secret manager, document access policy |
| **No monitoring/alerting** | Medium | Medium | Prometheus metrics, Sentry, log aggregation |
| **No runbooks** | Medium | Medium | Document common failure scenarios |
| **Infrequent deployments** | Low | Medium | CI/CD pipeline, regular deploy schedule |

## Compliance Risks

### MEDIUM

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **User data exposure** | Low | Medium | Minimize data collection, encryption at rest |
| **No data retention policy** | Medium | Medium | Define and implement retention schedule |
| **GDPR (EU users)** | Low | Medium | Data export/deletion capability, privacy policy |

## External Dependencies

| Dependency | Risk | Mitigation |
|------------|------|------------|
| **Neynar API** | API downtime, price changes, key revocation | Mock mode fallback, monitor status page |
| **OpenAI API** | API downtime, rate limits, cost changes | Mock mode, cost alerts, model fallback |
| **Farcaster protocol** | Protocol changes breaking bot | Monitor official announcements, rapid adaptation |
| **Docker/** | Container vulnerabilities | Regular image updates, security scanning |

## Security Checklist

- [x] No API keys in frontend bundle
- [x] No signer UUID in frontend
- [x] Webhook signature verification
- [x] Secret scanner prevents commits
- [x] CORS strict origins
- [x] Rate limiting
- [x] Admin route protection
- [x] Audit logging
- [x] URL safety analysis
- [x] Safety warnings for user claims
- [ ] Real data encryption at rest (Postgres)
- [ ] Real secret manager integration
- [ ] Penetration testing
- [ ] Security audit by external party

## Incident Response

If a security incident occurs:

1. **Contain** — Revoke compromised keys, block attackers
2. **Assess** — Determine scope of breach
3. **Notify** — Inform affected users within 72 hours (GDPR)
4. **Remediate** — Fix vulnerability
5. **Review** — Post-mortem, update risk register
