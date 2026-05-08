# CLAIM_AND_AIRDROP_RISK_POLICY.md — Claim and Airdrop Content Policy

**Status:** Complete

## Core Principle

PULO treats all airdrop, claim, token, and reward content as **high-risk by default**. No guaranteed language. No wallet connection recommendations without verified official sources.

## Content Classification

### Caution Keywords
The following keywords trigger elevated scrutiny:
- `airdrop`, `claim`, `token`, `reward`, `bonus`, `giveaway`, `presale`, `ico`, `ido`, `nft mint`

### Scam Keywords
Content containing these is immediately scored:
- `free token`, `guaranteed profit`, `must act now`, `limited time offer`
- `claim your reward now`, `send to receive`, `airdrop confirmed`
- `private sale access`, `whitelist spots`, `double your tokens`, `80% apy guaranteed`

## Response Rules

### For Airdrop/Claim Content

1. **Never confirm an airdrop without verification**
2. **Never suggest connecting a wallet**
3. **Never use "guaranteed" language**
4. **Always include verification caveat** if sharing

### Verification Levels

| Level | Criteria | Required Response |
|---|---|---|
| Verified | Official source + high confidence (≥0.85) | Normal sharing allowed |
| Probable | Multiple credible sources + medium confidence | "This appears to be..." |
| Unverified | Low confidence OR non-official source | "This is unverified" |
| Suspicious | Scam keywords + urgency | Block/reject |

### Safe Language Patterns

**Allowed:**
- "According to [official source]..."
- "This appears to be a [claim type]..."
- " DYOR — this is not financial advice"
- "Unverified: Please verify independently"

**Never Allowed:**
- "Guaranteed airdrop"
- "Confirmed token distribution"
- "You WILL receive..."
- "Connect your wallet to claim"

## Auto-Publish for Claim Content

Auto-publishing airdrop/claim content requires ALL of:
1. `isOfficialSource === true`
2. `riskLevel === 'low'`
3. `claimConfidence ≥ 0.85`
4. User consent for auto-publish

## Truth Check Integration

When a cast contains a claim about an airdrop:
1. Extract the claim via `truth_check_claim_extraction`
2. Verify against known official sources
3. Apply verification level matrix above
4. Never auto-publish unverified claims

## User Education

When PULO detects suspicious airdrop content:
- Warn user about scam indicators
- Provide link to official channels
- Never reproduce suspicious links directly
- Suggest reporting to the platform

## Examples

### Blocked Content
```
"DEGEN airdrop is confirmed! Send 0.01 ETH to get 100 DEGEN! Limited time!"
```
Reason: Guaranteed language + send-to-receive + urgency + non-official

### Allowed Content (with caveats)
```
"According to the official DEGEN channel, the season 4 airdrop is being processed.
DYOR. This is not financial advice."
```

### Unverified Guidance
```
"Claim content detected. Verification level: unverified.
Do not engage. Report as suspicious."
```
