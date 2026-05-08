# Phase 08 — PULO Radar: Trend Detection

## Status: ✅ Complete

## Deliverables

### Packages

- [x] `@pulo/radar` — 12 radar components + RadarScan orchestrator + types
- [x] `@pulo/db` — radar schema (radarTrends, radarTrendSources, radarKeywords, radarWatchedChannels)

### Apps

- [x] `pulo-api` — 5 radar endpoints (GET trends, GET trend/:id, POST scan, POST approve, POST reject)
- [x] `pulo-worker` — BullMQ worker `radar.scan` every 15 minutes

### UI

- [x] `/dashboard/radar` — user-facing trend list with category filter
- [x] `/admin/radar` — admin trend management with approve/reject

### Docs

- [x] `docs/architecture/RADAR_FLOW.md`
- [x] `docs/api/RADAR_API.md`
- [x] `docs/errors/RADAR_ERRORS.md`
- [x] `plan/phases/PHASE_08_RADAR.md`

### Tests

- [x] 12 passing tests in `@pulo/radar`:
  - keyword clustering
  - trend score calculation
  - high spam lowers score
  - high trusted author raises score
  - suspicious claim risk flag
  - admin approve alert
  - cast text normalization
  - velocity fading detection
  - engagement recast weight

## Components (12)

1. `ChannelWatcher` — fetches casts from watched channels
2. `CastIngestionNormalizer` — normalizes tokens/addresses
3. `KeywordWatcher` — clusters by matched keywords
4. `TrendClusterer` — groups by ≥50% keyword overlap
5. `TrendScorer` — 0–100 score from 9 weighted factors
6. `VelocityScorer` — velocity/hour + fading detection
7. `TrustWeightedAuthorScorer` — trusted author weighting
8. `EngagementScorer` — recast > reply > like weighting
9. `LinkRiskAnalyzer` — suspicious URL detection
10. `ClaimRiskAnalyzer` — urgency/guaranteed-profit pattern detection
11. `TrendSummarizer` — human-readable summary generation
12. `AlertCandidateSelector` — alert eligibility determination

## Configuration

- Default channels: base, farcaster, miniapps, builders, crypto, airdrop, token
- Default keywords: EN (20) + TR (20) covering airdrop, grant, reward, claim patterns
- Scan interval: 15 minutes

## Score Formula

```
score = volume_score + velocity_score + unique_author_score
      + trusted_author_score + engagement_score + channel_relevance_score
      + onchain_or_official_confirmation_score
      - spam_score - scam_risk_score
```

## Typecheck

- All packages and apps pass `pnpm -r typecheck`
- 12 radar tests pass
