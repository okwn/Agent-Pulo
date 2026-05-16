# Radar Flow

## Overview

PULO Radar detects and tracks trends in the Far caster ecosystem — airdrops, grants, rewards, token launches, scam warnings, and social trends. It scans channels, clusters related casts, scores trends, and surfaces alert candidates for admin review.

## Architecture

```
ChannelWatcher ──► CastIngestionNormalizer ──► KeywordWatcher ──► TrendClusterer
       │                                                         │
       │                    TrendSummarizer ◄────────────── TrendScorer
       │                           │                              │
       │                     AlertCandidate                     │
       │                      Selector                          │
       │                           │                              │
       │                    RadarScan.run() ◄────────────── RadarDB
       │                                                         │
       └───────────────────────────────────────────────────────────────► IFarcasterProvider
```

## Pipeline Stages

### 1. ChannelWatcher

Fetches recent casts from watched channels via farcaster provider (`searchCasts channel:${id}`). Returns raw `RadarCast[]`. If no provider is configured, returns empty array (supports mock mode).

**Channels:** base, farcaster, miniapps, builders, crypto, airdrop, token, degen, zora, ai (10 channels)

### 2. CastIngestionNormalizer

Normalizes raw casts into `RadarCast` format. Strips:
- Handles (`@user` → `USER`)
- Token symbols (`$DEGEN` → `TOKEN`)
- Addresses (`0x...` → `ADDRESS`)
- URLs (`https://` → `LINK`)
- Numbers (`1.5%` → `NUM`)

Also deduces `engagementCount`, `recastCount`, `replyCount`.

### 3. KeywordWatcher

Scans normalized casts against EN + TR keyword lists. Sets `watchwordMatches[]` on each cast. Maps keywords to categories using `CATEGORY_KEYWORDS`. Also:
- `hasSuspiciousClaim(text)` — flags urgency/wallet/guaranteed patterns
- `normalizeTitle(text)` — strips noise for clustering dedup

**EN keywords:** claim, airdrop, reward, rewards, eligibility, allocation, snapshot, points, season, quest, mint, allowlist, token, drop, grant, builder program, retro funding, mini app rewards, scam, phishing, fake

**TR keywords:** ödül, uygunluk, puan, görev, kampanya, başvuru, hibe, dolandırıcılık, sahte, kimlik avı

### 4. TrendClusterer

Clusters casts by normalized text similarity (first 80 chars). Groups casts sharing keywords. Merges clusters with >50% keyword overlap.

Each cluster becomes a `TrendClusterInput`: `{ title, normalizedTitle, keywords, casts, category, firstSeen, lastSeen }`.

Category inference: keyword → category mapping (airdrop→airdrop, grant→grant, scam→scam_warning, etc.)

### 5. TrendScorer

Calculates composite score from 9 signals:

| Signal | Weight | Description |
|--------|--------|-------------|
| `volume_score` | 15% | log2(castCount) |
| `velocity_score` | 15% | mentions per hour |
| `unique_author_score` | 10% | log2(uniqueAuthors) |
| `trusted_author_score` | 15% | highTrustCount/uniqueAuthors |
| `engagement_score` | 10% | log2(engagementTotal) |
| `channel_relevance_score` | 5% | avg CHANNEL_RELEVANCE |
| `official_confirmation_score` | 10% | +onchainConfirmation bonus |
| `spam_score` | -penalty | spam signals reduce score |
| `scam_risk_score` | -penalty | scam signals reduce score |

Score range: 0-100. Higher = more significant.

**Risk assessment:** `LinkRiskAnalyzer` + `ClaimRiskAnalyzer` run on all casts; max risk score determines `riskLevel` (low/medium/high).

### 6. TrendSummarizer

Generates a `TrendSummary`: `{ title, summary, keyPoints, recommendedAction, confidence }`.

Action decisions:
- `scam_warning` category or `high` risk → `alert`
- `castCount < 3` → `watch`
- High volume airdrop/token → `investigate`
- Otherwise → `watch`

### 7. AlertCandidateSelector

Determines if a trend should become a user alert. Criteria:
- `riskLevel = high` → always alert (high priority)
- `category = scam_warning` → always alert (high priority)
- `velocity >= 5 && score >= 60` → alert (medium/high)
- `trustedAuthorCount >= 5 && score >= 50` → alert (medium)
- `score >= 75` → alert (medium)
- `castCount < 5 && scam_risk_score > 0.3` → alert (high)

### 8. RadarScan Orchestrator

`RadarScan.run()` executes full pipeline:
1. Fetch channel casts
2. Normalize
3. Scan keywords
4. Filter keyword-matched casts
5. Cluster into trends
6. Score + persist each trend to DB
7. Return `{ trendsFound, newTrends, updatedTrends, alerts }`

**DB persistence:**
- New trends: created with `adminStatus = 'detected'`
- Existing trends: score updated, sources appended
- Returns `{ id, isNew, shouldAlert }` per cluster

## Categories

| Category | Keywords | Description |
|----------|----------|-------------|
| `airdrop` | airdrop, snapshot, drop, free token | Token distributions |
| `reward_program` | reward, rewards, points, season, quest | Loyalty/earn programs |
| `token_launch` | token, launch, mint, allowlist, ICO | New token events |
| `grant` | grant, funding, builder program, retro funding | Funding opportunities |
| `claim` | claim, eligibility, allocation, qualify | Claims processes |
| `hackathon` | hackathon, bounty, contest, prize | Competition events |
| `scam_warning` | scam, fake, phishing | Security warnings |
| `social_trend` | trending, viral, exploding | Viral content |
| `farcaster_meta` | farcaster, frame, cast | Protocol discussions |
| `miniapp_opportunity` | mini app, miniapp, frame, opportunity | App building opportunities |
| `unknown` | (default) | Uncategorized |

## Admin Status Flow

```
detected ──► watching ──► approved ──► alerted ──► archived
    │           │
    └──────────┴──────► rejected
```

- `detected`: newly discovered trend
- `watching`: being monitored
- `approved`: cleared for user alerts
- `rejected`: not a real opportunity / spam
- `alerted`: sent to users
- `archived`: no longer relevant

## Score Components

```
trend_score =
  volume_score(0.15)
+ velocity_score(0.15)
+ unique_author_score(0.10)
+ trusted_author_score(0.15)
+ engagement_score(0.10)
+ channel_relevance_score(0.05)
+ official_confirmation_score(0.10)
- spam_score
- scam_risk_score
```

## Risk Analysis

**LinkRiskAnalyzer** — flags:
- URL shorteners (bit.ly, tinyurl, t.co, etc.)
- Suspicious patterns from `@pulo/safety`
- Address-like paths with `?`

**ClaimRiskAnalyzer** — flags:
- Scam keywords from `@pulo/safety`
- Urgency patterns (`act now`, `expires today`)
- Guaranteed profit claims
- Wallet connection requests
- Engagement bait (`you've been selected`)

## Worker Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `radar.scanChannels` | Every 15 min | Full radar scan pipeline |
| `radar.clusterTrends` | Part of scan | Groups casts into trends |
| `radar.scoreTrends` | Part of scan | Scores each trend |
| `radar.generateAlerts` | Part of scan | Selects alert candidates |
| `radar.archiveOldTrends` | Daily | Archives trends >7 days old with low score |