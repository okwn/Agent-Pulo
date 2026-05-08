# RADAR Flow — Trend Detection Architecture

## Overview

PULO Radar is a real-time trend detection system that monitors Far caster channels for emerging opportunities (airdrops, grants, token launches, reward programs) and threats (scams, suspicious claims).

## Components (12)

| Component | Responsibility |
|-----------|---------------|
| `ChannelWatcher` | Fetches casts from watched channels via IFarcasterProvider |
| `CastIngestionNormalizer` | Normalizes token symbols ($DEGEN→TOKEN), addresses (0x…→ADDRESS), URLs |
| `KeywordWatcher` | Clusters casts by matched watchword keywords |
| `TrendClusterer` | Groups related casts into trend clusters by keyword overlap ≥50% |
| `TrendScorer` | Calculates trend score (0–100) from 9 weighted factors |
| `VelocityScorer` | Detects trend velocity (casts/hour) and fading signals |
| `TrustWeightedAuthorScorer` | Weights score by trusted author participation |
| `EngagementScorer` | Scores engagement (recasts > replies > likes) |
| `LinkRiskAnalyzer` | Flags casts with suspicious URLs or phishing patterns |
| `ClaimRiskAnalyzer` | Flags urgency/guaranteed-profit scam patterns in claim text |
| `TrendSummarizer` | Generates human-readable trend title, summary, key points |
| `AlertCandidateSelector` | Determines whether a trend qualifies for admin alert |

## Default Watched Channels

```
base, farcaster, miniapps, builders, crypto, airdrop, token
```

## Default Keywords

**English:** airdrop, token, launch, grant, reward, claim, bonus, eligibility, whitelist, mint, NFT, governance, incentive, bug bounty, hackathon, bounty, prize, competition, staking, farming

**Turkish:** airdrop, token, havalele, grant, ödül, talep, bonus, uygunluk, beyaz liste, mint, NFT, yönetişim, teşvik, hata ödülü, hackathon, ödül, yarışma, stake, çiftlik

## Flow

```
ChannelWatcher
    ↓ casts[]
CastIngestionNormalizer
    ↓ normalized casts[]
KeywordWatcher
    ↓ casts with watchwordMatches[]
TrendClusterer
    ↓ clusters[]
TrendScorer + VelocityScorer + TrustWeightedAuthorScorer + EngagementScorer
    ↓ scored clusters
LinkRiskAnalyzer + ClaimRiskAnalyzer
    ↓ risk flags
TrendSummarizer
    ↓ summarized trends
AlertCandidateSelector
    ↓ alert candidates
radarScan.run() → persists to radarTrends + radarTrendSources via @pulo/db
```

## Score Formula (0–100)

```
score = volume_score + velocity_score + unique_author_score
      + trusted_author_score + engagement_score + channel_relevance_score
      + onchain_or_official_confirmation_score
      - spam_score - scam_risk_score
```

## Categories

`claim`, `reward_program`, `token_launch`, `airdrop`, `grant`, `hackathon`, `scam_warning`, `social_trend`, `unknown`

## Risk Levels

`low`, `medium`, `high`, `critical`, `unknown`

## Admin Statuses

`detected` → `watching` → `approved` / `rejected` → `alerted` / `archived`

## Scheduling

- Worker job `radar.scan` runs every 15 minutes via BullMQ
- Seeding of default keywords and channels happens on first run

## Persistence

Trend records stored in `radarTrends` table. Source casts stored in `radarTrendSources` table. Keywords and channels seeded into `radarKeywords` and `radarWatchedChannels` tables.
