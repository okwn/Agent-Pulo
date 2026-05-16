# Truth Analysis Flow

## Overview

`@pulo/truth` provides an evidence-based truth-check workflow for Far caster content. It detects truth-check queries, extracts claims, collects evidence from casts and web search, analyzes replies, and produces a veracity verdict with a public reply.

## Architecture

```
NormalizeEvent → TruthChecker.run()
                      │
                      ▼
             1. TruthIntentDetector
             2. ClaimExtractor
             3. EvidenceCollector
             4. ReplyCommentAnalyzer
             5. SourceTrustScorer
             6. ContradictionDetector
             7. ScamSignalDetector
             8. TruthVerdictEngine
             9. TruthReportFormatter
```

## Components

### Intent Detection

`TruthIntentDetector` detects truth-check queries in cast text. Patterns cover English and Turkish:

**English:** `is this true`, `fact check`, `verify this`, `true or false`, `fake?`, `scam?`, etc.

**Turkish:** `bu doğru mu`, `doğru mu`, `gerçek mi`, `doğrul`, `kontrol et`, etc.

Detection returns `detected`, `queryLanguage` (`en` | `tr` | `unknown`), `patterns` matched, and `confidence`.

### Claim Extraction

`ClaimExtractor` strips question framing and meta-commentary to isolate the factual claim. Categories: `factual`, `opinion`, `prediction`, `unstated`.

### Evidence Collection

`EvidenceCollector` collects evidence from three sources:

1. **Parent thread casts** — fetched from `TruthCheckContext.parentThreadHashes`
2. **Reply casts** — fetched from `TruthCheckContext.replyHashes`
3. **Keyword cast search** — casts matching claim keywords via farcaster provider
4. **Web search** — results from `WebSearchProvider` (Tavily/SerpAPI/mock)

Web results are added as `EvidenceItem` with `type: 'web'`. Cast results have `type: 'cast'`.

### Reply Analysis

`ReplyCommentAnalyzer` classifies each reply cast as `supporting`, `contradicting`, `neutral`, or `suspicious` based on keyword matching.

### Source Trust

`SourceTrustScorer` scores evidence sources by trust level:

- `official` — official project accounts
- `high_trust` — well-known accounts with high follower counts
- `medium_trust` — regular active accounts
- `low_trust` — new or low-engagement accounts
- `unknown` — unclassified

### Scam Detection

`ScamSignalDetector` flags scam risk using `SCAM_KEYWORDS` from `@pulo/safety`. Triggers:
- Wallet connection requests
- Guaranteed profit claims
- URL shorteners
- Private key requests
- Suspicious link patterns

### Verdict Engine

`TruthVerdictEngine.produceVerdict()` produces weighted verdicts:

| Signal | Weight |
|--------|--------|
| Evidence ratio | 40% |
| Sentiment analysis | 20% |
| Risk adjustment | 20% |
| Source trust | 15% |
| Prediction penalty | 5% |

**Verdicts:** `likely_true`, `likely_false`, `mixed`, `unverified`, `scam_risk`, `insufficient_context`

### Report Formatting

`TruthReportFormatter.format()` produces:
- `publicReplyText` — ≤320 chars, bilingual (en/tr)
- `recommendedAction` — `safe_to_share` | `verify_first` | `do_not_share` | `report` | `cannot_determine`
- `dashboardExplanation` — 2-3 sentence explanation

## Web Search Modes

| Mode | Provider | Env Key |
|------|-----------|---------|
| `mock` | Returns keyword-matched fixture data | None |
| `tavily` | POST to `api.tavily.com/search` | `TAVILY_API_KEY` |
| `serpapi` | GET to `serpapi.com/search` | `SERPAPI_API_KEY` |
| `disabled` | Always returns empty | None |

Default: `PULO_SEARCH_MODE` env var or `mock`.

## Turkish Support

Public reply formatting supports `queryLanguage`:
- `en` — English verdict labels and reply text
- `tr` — Turkish verdict labels and reply text
- `unknown` — defaults to English

Labels:
| Verdict | English | Turkish |
|---------|----------|---------|
| `likely_true` | Pulo check: Likely true | Pulo kontrol: Büyük ihtimalle doğru |
| `likely_false` | Pulo check: Likely false | Pulo kontrol: Büyük ihtimalle yanlış |
| `scam_risk` | Pulo check: Scam risk | Pulo kontrol: Dolandırıcılık riski |

## Safety Rules

### Airdrop / Claim Safety

- Claims referencing `airdrop` + `claim` without an official source cannot be marked `likely_true`
- `scam_risk` verdict overrides all other verdicts (highest priority)
- Wallet connection requests in evidence are weighted toward `scam_risk`

### Publish Safety

- All publish paths go through SafetyGate preCheck and postCheck
- `user.consents.autoPublish` must be true for auto-publish
- Signer UUID validated at provider factory (never in request bodies)
- Idempotency key: `publish-reply:{runId}`

## Evidence Item Schema

```typescript
interface EvidenceItem {
  type: 'cast' | 'web';
  castHash: string;     // cast hash for type='cast', URL for type='web'
  authorFid: number;
  authorUsername?: string;
  text: string;
  sentiment?: 'supporting' | 'contradicting' | 'neutral' | 'suspicious';
  isOfficialSource?: boolean;
  isHighTrustUser?: boolean;
  timestamp?: string;
  // web-only
  url?: string;
  source?: string;
}
```