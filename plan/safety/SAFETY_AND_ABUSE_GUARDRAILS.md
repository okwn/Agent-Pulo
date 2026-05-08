# SAFETY_AND_ABUSE_GUARDRAILS.md

## Core Safety Principles

1. **Zero Trust** — All input from Far is untrusted until validated
2. **Least Privilege** — Bot operates with minimum required permissions
3. **Fail Safe** — Degrade gracefully on errors; never silently fail
4. **Audit Everything** — Every action logged with timestamp, fid, and action type

## Abuse Vectors

| Vector | Mitigation |
|---|---|
| Mass mention spam | Rate limit per FID; max 50 casts/day per user |
| Prompt injection | Input sanitization; never eval user content |
| @pulo harassment | Block list; user-level mute; admin review queue |
| Replay attacks | Cast hash deduplication; idempotency keys |
| Resource exhaustion | Job timeout (30s max); queue depth limits |
| Credential theft | Signer key never in code; env-only storage |
| Unauthorized cast posting | Signed requests only; admin FID whitelist |

## Rate Limiting

- Per-user: 50 casts/day (Free), 500/day (Pro), unlimited (Team)
- Per-IP: 100 requests/minute
- Global: 1000 jobs/minute across all users

## Content Moderation

### Block Rules
- No response to accounts on blocked list
- No response to casts containing blocked keywords
- No response to spam-classified content (confidence > 0.8)

### Spam Detection
- TF-IDF based classifier trained on labeled Far spam
- Confidence threshold: 0.8 — below this, no action taken
- Escalation: scores 0.6–0.8 → admin review queue

## Human-in-the-Loop

- All automated actions logged
- Admin can pause/resume bot globally
- Admin can whitelist or blacklist specific FIDs
- No mass actions without admin confirmation

## Incident Response

1. Detect anomaly (spike in errors, unusual traffic)
2. Alert admin via DM
3. Auto-throttle or pause processing
4. Human reviews logs
5. Resume with mitigations

## Compliance

- No data sold or shared
- Logs retained 90 days
- User can request data export or deletion
- GDPR-compliant for EU users