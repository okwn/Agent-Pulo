# Truth Analysis — Specification

## Overview

Truth Analysis is Phase 07 of PULO. It provides AI-powered fact-checking for on-chain content, detecting misinformation, scam signals, and contradictions using rule-based analysis (LLM integration planned for Phase 09).

## Architecture

```
User casts "is this true?" → Intent Detection → TruthChecker.run()
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
              ClaimExtractor                   EvidenceCollector             ReplyCommentAnalyzer
              extract(text)                    collect(claim, ctx)              analyze(evidence, claim)
                    │                               │                               │
                    └───────────────────────────────┼───────────────────────────────┘
                                                    │
                                         SourceTrustScorer.score(evidence)
                                                    │
                                         ContradictionDetector.detect(claim, evidence)
                                                    │
                                         ScamSignalDetector.detect(claim, evidence)
                                                    │
                                         TruthVerdictEngine.produceVerdict(...)
                                                    │
                                         TruthReportFormatter.format(...) → TruthReport
                                                    │
                                         [SafetyGate] → Public Reply → DB
```

## Components (8 total)

| Component | Responsibility |
|---|---|
| `ClaimExtractor` | Rule-based extraction of verifiable claims from cast text |
| `EvidenceCollector` | Fetches related casts via `IFarcasterProvider` (replies, threads, keyword search) |
| `ReplyCommentAnalyzer` | Classifies reply sentiment (supporting/contradicting/suspicious) |
| `SourceTrustScorer` | Assigns trust levels (official/high_trust/medium_trust/low_trust/unknown) |
| `ContradictionDetector` | Detects explicit denials, scam allegations, factual corrections |
| `ScamSignalDetector` | Uses `SCAM_KEYWORDS` + `SUSPICIOUS_LINK_PATTERNS` from @pulo/safety |
| `TruthVerdictEngine` | Produces verdict from all components using weighted scoring |
| `TruthReportFormatter` | Formats public reply (≤320 chars) and dashboard explanation |

## Intent Detection

Supports English and Turkish via `TRUTH_CHECK_PATTERNS`:

**English patterns (17):** `is this true`, `is this real`, `verify this`, `can you verify`, `source check`, `check this`, `true?`, `fake?`, `real?`, `accurate?`, `scam?`, `legit?`, `real or fake`, `true or scam`, `fact check`, `fact-check`, `true or false`

**Turkish patterns (15):** `bu doğru mu`, `doğru mu`, `gerçek mi`, `doğrul`, `doğrula`, `gerçek mi bu`, `bu gerçek mi`, `scam mı`, `sahte mi`, `source?`, `claim doğru mu`, `iddia doğru mu`, `bu iddia doğru mu`, `gerçekten doğru mu`, `kontrol et`, `incele`

## Verdict Types

| Verdict | Description |
|---|---|
| `likely_true` | Multiple supporting sources, high confidence, no contradictions |
| `likely_false` | Contradicting evidence, low source trust, factual corrections found |
| `mixed` | Evidence is split; some sources support, others contradict |
| `unverified` | Insufficient evidence (needs ≥2 evidence items to verify) |
| `scam_risk` | Scam signals detected; wallet requests, guaranteed profits, suspicious links |
| `insufficient_context` | Cannot determine due to lack of context |

## Verdict Scoring Algorithm

```
score = (evidenceRatio × 0.4) + (sentimentRatio × 0.2) + (1 - riskScore) × 0.2 + (sourceTrustBonus × 0.15) + claimConfidenceBonus

evidenceRatio = supporting / (supporting + contradicting + 1)
sentimentRatio = (supportingReplies - contradictingReplies) / totalReplies
sourceTrustBonus = avg confidence of official/high_trust sources
```

Score → verdict mapping: `≥0.65` likely_true, `≤0.35` likely_false, `0.35-0.65` mixed, `score < 0.2` with evidence ≥ 2 → unverified

## Safety Integration

`TruthChecker.run(event, safetyGate?)` accepts optional `SafetyGate`. The gate enforces:
- Consent checks before publishing results publicly
- Rate limiting per user plan
- Risk-based content filtering

Public reply is gated: if `safetyGate.shouldBlockPublicReply()` returns true, the reply text is generated but not published.

## Public Reply Style

≤ 320 chars. Format:
```
[Pulo Check: {verdict}] {shortAnswer} ({confidence}% confidence)
{safety_warning_if_scam_risk}
```
For unverified: ask user to seek official sources.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/truth/check` | Run truth check on target cast |
| GET | `/api/truth/:id` | Get specific truth check by ID |
| GET | `/api/admin/truth-checks` | List recent truth checks (admin) |
| POST | `/api/truth/detect-intent` | Detect if text contains truth-check query |

## Data Model

`TruthCheck` table (Drizzle):
- `id` (uuid), `userId`, `targetCastHash`, `claimText`
- `verdict` (enum), `confidence` (0-100), `evidenceSummary`
- `riskLevel` (enum), `sourceCastHashes` (text[]), `status`
- `createdAt`, `updatedAt`

## Tests

6 acceptance tests:
1. Turkish intent detection — `bu doğru mu?`
2. English intent detection — `is this true?`
3. Insufficient evidence → unverified verdict
4. Suspicious links → scam_risk
5. Official source confirmation → higher confidence
6. Public reply is ≤ 320 chars

## Dependencies

- `@pulo/observability` — logging
- `@pulo/farcaster` — `IFarcasterProvider` (getCastByHash, getReplies, searchCasts)
- `@pulo/safety` — `SafetyGate`, `SCAM_KEYWORDS`, `SUSPICIOUS_LINK_PATTERNS`
- `@pulo/db` — `truthCheckRepository` for persistence