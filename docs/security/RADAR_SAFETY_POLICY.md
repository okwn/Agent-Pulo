# Radar Safety Policy

## Principle

Radar surfaces potential opportunities (airdrops, grants, rewards) that users act on. False or misleading trends can cause users to waste time, share sensitive info, or fall for scams. PULO Radar enforces strict safety rules before any trend becomes an alert.

## Alert Eligibility Rules

### Rule 1: Admin Approval Required

No trend becomes an alert unless `adminStatus = approved`. The only exceptions are:

- **`category = scam_warning`** — auto-escalated regardless of admin status
- **`riskLevel = high`** — flagged for immediate admin review but not auto-alerted

### Rule 2: Scam Warning Always Escalates

Trends with `category = scam_warning` are:
- Immediately flagged in admin dashboard
- Eligible for auto-alert (no approval needed)
- Never rejected without admin review

### Rule 3: No Alert Without Evidence

A trend cannot be approved if:
- `castCount < 3` — too little signal
- `trustedAuthorCount = 0` AND `officialSourceCount = 0` — no credible sources
- `riskLevel = high` AND `scam_risk_score > 0.5` — red flag

### Rule 4: Link Safety Gate

Before a trend is approved, all sources are checked:
- Any source with `hasSuspiciousLink = true` raises riskLevel to at least `medium`
- Any source with `hasClaimRisk = true` raises riskLevel to at least `medium`
- A trend with 2+ suspicious links cannot be approved

### Rule 5: Airdrop-Specific Rules

Trends tagged `airdrop` or `claim` are subject to extra scrutiny:
- Official confirmation required for `approved` status (unless all sources are high_trust+)
- Wallet connection requests anywhere in sources → automatic `high` riskLevel
- "Claim now" urgency patterns → riskLevel elevation

## Risk Scoring for Radar

| Signal | Effect |
|--------|--------|
| Suspicious link found | +0.3 to scam_risk_score |
| Claim risk found | +0.3 to scam_risk_score |
| Wallet request pattern | +0.4 to scam_risk_score |
| Guaranteed profit claim | +0.3 to scam_risk_score |
| URL shortener in source | +0.25 to scam_risk_score |
| Spam pattern detected | +0.15 to spam_score |

## Score Gates for Approval

| Category | Min Score | Min Sources | Notes |
|----------|----------|------------|-------|
| `airdrop` | 50 | 5 | Official sources preferred |
| `grant` | 40 | 3 | — |
| `reward_program` | 40 | 3 | — |
| `token_launch` | 55 | 3 | High risk — verify token contract |
| `scam_warning` | 0 | 1 | Always escalate, no min score |
| `social_trend` | 60 | 10 | Needs organic virality |
| `hackathon` | 35 | 2 | — |

## What Gets Logged

- Every trend: id, title, category, score, riskLevel, adminStatus, castCount, trustedAuthorCount
- Every approval/rejection: admin action, admin FID, trend ID, timestamp
- Every alert sent: alert ID, user FID, trend ID, delivery status

## What Never Happens

- A trend is NEVER auto-alerted unless `category = scam_warning`
- A trend with suspicious links is NEVER approved without admin review
- An airdrop "guarantee" is NEVER marked as safe — always elevate risk
- A wallet connection request in any source NEVER results in a clean riskLevel
- Radar scan results are NEVER sent directly to users without admin approval (except scam warnings)