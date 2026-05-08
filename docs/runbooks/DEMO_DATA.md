# Demo Data Reference

Database schema and seed data for PULO demo scenarios.

## Demo Users

| FID | Username | Plan | Purpose |
|-----|----------|------|---------|
| 100 | alice_farcaster | pro | Trusted user, trend sources |
| 101 | bob_in_crypto | pro | Trusted user, truth check sources |
| 102 | crypto_trader | free | Token claim author, plan limit user |
| 103 | new_user_anon | free | Scam report author, low trust |
| 999 | pulo_demo | pro | Composer demo user |

## Demo Casts

### Scenario 1: Mention Summary

| Hash | Author | Text |
|------|--------|------|
| demo_cast_mention_001 | alice_farcaster | "Hey @pulo summarize this thread please 🙏" |

### Scenario 2: Truth Check

| Hash | Author | Text | Parent |
|------|--------|------|--------|
| demo_cast_token_claim_001 | crypto_trader | "NEW TOKEN LAUNCH $SUPERCOIN airdrop!" | - |
| demo_cast_comment_001 | bob_in_crypto | "Official source not found. Might be phishing." | demo_cast_token_claim_001 |
| demo_cast_comment_002 | new_user_anon | "Clicked link, asked for seed phrase. SCAM!" | demo_cast_token_claim_001 |

### Scenario 3: Radar Trend

| Hash | Author | Text |
|------|--------|------|
| demo_cast_reward_001 | alice_farcaster | "Just received $GRASS season 2 rewards!" |
| demo_cast_reward_002 | bob_in_crypto | "$GRASS season 2 rewards being distributed" |
| demo_cast_reward_003 | alice_farcaster | "Update: $GRASS rewards confirmed" |

### Scenario 4: Scam Warning

| Hash | Author | Text |
|------|--------|------|
| demo_cast_scam_001 | new_user_anon | "WARNING: fake_metamask-wallet.xyz scam" |
| demo_cast_scam_002 | new_user_anon | "SCAM ALERT: scam-wallet-verify.xyz" |
| demo_cast_scam_003 | new_user_anon | "Third account with same scam eth-giveaway-scam.xyz" |

### Scenario 5: Composer

| Hash | Author | Text |
|------|--------|------|
| demo_cast_weak_001 | pulo_demo | "what do you guys think about this crypto thing is it good? should i buy maybe? probably not idk" |

## Demo Drafts

| ID | User | Cast | Text | Score | Status |
|----|------|------|------|-------|--------|
| demo-draft-001 | pulo_demo (999) | demo_cast_weak_001 | Improved version... | 72 | pending |

## Truth Checks

| ID | User | Target Cast | Verdict | Confidence | Risk |
|----|------|-------------|---------|------------|------|
| demo-truth-001 | crypto_trader (102) | demo_cast_token_claim_001 | uncertain | 45 | high |

## Radar Trends

### $GRASS Season 2 Rewards

| Field | Value |
|-------|-------|
| Title | $GRASS Season 2 Rewards |
| Category | reward_program |
| Score | 75 |
| Velocity | 15 |
| Risk Level | low |
| Admin Status | detected → approved |
| Sources | 3 casts, 2 trusted authors |

### FREE ETH Scam Campaign

| Field | Value |
|-------|-------|
| Title | FREE ETH Scam Campaign |
| Category | scam_warning |
| Score | 90 |
| Velocity | 25 |
| Risk Level | critical |
| Admin Status | detected |
| Sources | 3 casts, 0 trusted authors |
| Suspicious Links | fake_metamask-wallet.xyz, scam-wallet-verify.xyz, eth-giveaway-scam.xyz |

## Alerts

| ID | User | Type | Title | Risk |
|----|------|------|-------|------|
| demo-alert-001 | alice (100) | reward_program | "$GRASS Season 2 Rewards" | low |
| demo-scam-alert-001 | (opted-in only) | scam_warning | "⚠️ FREE ETH Phishing" | critical |

## Rate Limits

| User | Limit Type | Used | Limit | Status |
|------|------------|------|-------|--------|
| crypto_trader (102) | truth_checks:daily | 5 | 5 | at limit |
| new_user_anon (103) | truth_checks:daily | 0 | 5 | available |

## Database Reset

To clear all demo data:

```bash
pnpm demo:reset --force
```

This removes:
- Demo users (FIDs 100, 101, 102, 103, 999)
- Demo casts
- Demo drafts
- Demo alerts
- Demo trends
- Rate limit events

System data (admin users, real user data) is preserved.