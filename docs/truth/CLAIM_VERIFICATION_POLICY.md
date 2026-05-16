# Claim Verification Policy

## Core Principle

PULO's truth analysis is **evidence-based and safety-first**. We do not declare claims true without supporting evidence, and we treat potentially dangerous content (scams, phishing, airdrop fraud) with maximum caution.

## Claim Classification

Every claim is categorized as one of:

| Category | Description |
|----------|-------------|
| `factual` | Objective claim about events, numbers, dates, actions |
| `opinion` | Subjective take, personal preference, or judgment |
| `prediction` | Forward-looking claim about future events |
| `unstated` | No clear claim extracted |

## Verdict Definitions

| Verdict | Meaning | Requires |
|---------|---------|---------|
| `likely_true` | Multiple credible sources support; low risk | Official sources OR multiple high-trust corroborations |
| `likely_false` | Credible sources contradict or factually wrong | At least one contradicting source or known false fact |
| `mixed` | Some sources support, some contradict | Both supporting and contradicting evidence |
| `unverified` | Discussion exists but no strong evidence for either side | At least some discussion but no official confirmation |
| `scam_risk` | Content shows signs of fraudulent intent | Scam keyword detection OR suspicious link patterns |
| `insufficient_context` | Not enough information to form a verdict | Claim too vague or no evidence collected |

## Evidence Quality Tiers

| Tier | Source | Weight Multiplier |
|------|--------|------------------|
| `official` | Official project channel / announced account | 2.0× |
| `high_trust` | Established account with high engagement | 1.5× |
| `medium_trust` | Regular active account | 1.0× |
| `low_trust` | New or low-engagement account | 0.5× |
| `unknown` | Unclassified | 0.3× |

## Airdrop / Claim Safety Rules

**Rule 1: No `likely_true` without official source**
If a claim references an `airdrop` or `claim` event and no official source is found, the verdict cannot be `likely_true` regardless of other supporting evidence. The highest possible verdict in this case is `unverified`.

**Rule 2: Airdrop keywords trigger elevated scrutiny**
Claims containing `airdrop`, `claim`, `free token`, `mint`, `whitelist`, `Allocation` trigger `scam_risk` screening before any other verdict is considered.

**Rule 3: Wallet connection = immediate warning**
Any evidence or cast text requesting users to "connect wallet", "sign transaction", or "send ETH/TOKEN" to claim an airdrop is a strong `scam_risk` signal. Weight: +0.4.

**Rule 4: Guaranteed profit = scam signal**
Claims promising "guaranteed returns", "risk-free yield", "double your tokens" are weighted toward `scam_risk` regardless of source quality.

**Rule 5: URL shorteners elevate risk**
Evidence containing bit.ly, tinyurl, goo.gl, or similar URL shorteners adds +0.25 to scam risk score. Official announcements use official domains.

## Source Validation

| Source Type | Example | Trust Level |
|-------------|---------|-------------|
| Official website | `protocol.xyz/blog` | `official` |
| Official social | `@protocol` on Warpcast | `official` |
| Official GitHub | `github.com/protocol` | `official` |
| Official blog | `blog.protocol.xyz` | `official` |
| Community high-follower | >10k followers, established | `high_trust` |
| Community mid-follower | 1k-10k followers | `medium_trust` |
| New account | <100 followers, <6 months | `low_trust` |
| Unknown | Not classified | `unknown` |

## Contradiction Detection

`ContradictionDetector` flags when:
1. The claimed event did not happen at the stated time/place
2. A named account denies the claim
3. Official sources state the opposite
4. The claim contradicts a known fact

If `hasContradictions = true`, the verdict cannot be `likely_true`.

## Publish Recommendation Matrix

| Verdict | Risk | Recommendation |
|---------|------|----------------|
| `likely_true` | low | `safe_to_share` |
| `likely_true` | medium/high | `verify_first` |
| `likely_false` | any | `do_not_share` |
| `mixed` | low | `verify_first` |
| `mixed` | medium/high | `do_not_share` |
| `unverified` | any | `cannot_determine` |
| `scam_risk` | any | `report` |
| `insufficient_context` | any | `cannot_determine` |

## What Gets Logged

- Every truth check attempt: `targetCastHash`, `verdict`, `confidence`, `processingTimeMs`
- DB persistence: `truth_checks` table with verdict, confidence, risk level, source cast hashes
- Safety blocks: `SafetyBlockError` caught and stored with `status=failed`

## What Never Happens

- A claim is NEVER marked `likely_true` if only community sources support it and no official confirmation exists
- `scam_risk` verdict is NEVER overridden by other verdicts
- Private keys, wallet signatures, and fund requests are NEVER "verified" — they are always flagged
- Airdrop "guarantees" are NEVER marked `likely_true`
- The bot signer UUID is NEVER exposed in logs or responses