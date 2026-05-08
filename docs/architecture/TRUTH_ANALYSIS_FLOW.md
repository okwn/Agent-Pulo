# Truth Analysis Flow

```
CAST ("is this true about $DEGEN airdrop?")
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. INTENT DETECTION (TruthIntentDetector)                       │
│    → TRUTH_CHECK_PATTERNS.en/tr matched?                        │
│    → queryLanguage ('en'|'tr'|'unknown')                        │
│    → confidence 0.0-1.0                                          │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ (if detected)
┌─────────────────────────────────────────────────────────────────┐
│ 2. BUILD CONTEXT (TruthChecker.buildContext)                    │
│    → Extract parentHash from event                               │
│    → Fetch parent cast via getCastByHash(parentHash)            │
│    → Fetch replies via getReplies(targetHash, {limit:10})      │
│    → Build TruthCheckContext {parentThreadHashes, replyHashes}  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CLAIM EXTRACTION (ClaimExtractor.extract)                    │
│    → factPatterns: token/chain claims, price claims, protocol   │
│    → Falls back to longest sentence if no pattern matched        │
│    → Returns ExtractedClaim {claim, category, urgency,          │
│      contextNeeded[], confidence, additionalClaims[]}            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. EVIDENCE COLLECTION (EvidenceCollector.collect)              │
│    → Fetch parent/reply casts via getCastByHash()               │
│    → Keyword search via searchCasts(keyword, {limit:5})         │
│    → classifySentiment per evidence item                         │
│    → Returns EvidenceItem[] with castHash, authorFid,           │
│      authorUsername, text, sentiment, timestamp                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. REPLY ANALYSIS (ReplyCommentAnalyzer.analyze)                │
│    → Categorize replies: supporting/contradicting/suspicious     │
│    → Collect keySupportingPoints, keyContradictingPoints        │
│    → warnings[] for suspicious content                           │
│    → Returns ReplyAnalysis { counts per sentiment, keyPoints,   │
│      warnings, overallSentiment }                                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. SOURCE TRUST SCORING (SourceTrustScorer.score)               │
│    → Check KNOWN_OFFICIAL_ACCOUNTS per project                  │
│    → Official account → level:'official', confidence:0.95        │
│    → Username patterns: 'foundation', 'team', 'official'        │
│    → Content patterns: 'official announcement', 'official blog'  │
│    → Returns SourceAssessment[] {level, source, reason,         │
│      confidence}                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. CONTRADICTION DETECTION (ContradictionDetector.detect)       │
│    → contradictionPatterns: explicit denial, scam allegation,    │
│      factual correction, verification absence                    │
│    → sharesContext(): requires 2+ significant words in common   │
│    → Returns ContradictionResult {hasContradictions,             │
│      contradictionScore, contradictingEvidence, supportingEvidence}│
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. SCAM SIGNAL DETECTION (ScamSignalDetector.detect)            │
│    → Uses SCAM_KEYWORDS from @pulo/safety                        │
│    → Uses SUSPICIOUS_LINK_PATTERNS from @pulo/safety            │
│    → Scoring: scam keyword +0.3, urgency +0.15, wallet +0.4,    │
│      guaranteed profit +0.3, suspicious link +0.25              │
│    → Returns RiskAssessment {overallRisk, flags[], summary, score}│
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. MARK TRUST ON EVIDENCE (TruthChecker.markTrustOnEvidence)    │
│    → Map username → trust level from sourceAssessments          │
│    → Set isOfficialSource, isHighTrustUser flags                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. VERDICT PRODUCTION (TruthVerdictEngine.produceVerdict)     │
│    → Priority: scam_risk overrides all else                     │
│    → Check insufficient_context (needs ≥2 evidence items)        │
│    → Score = evidenceRatio×0.4 + sentimentRatio×0.2 +           │
│      (1-riskScore)×0.2 + sourceTrustBonus×0.15 + claimConf×0.05 │
│    → Map score to verdict: ≥0.65 → likely_true, ≤0.35 →        │
│      likely_false, 0.35-0.65 → mixed, <0.2 → unverified         │
│    → Returns {verdict, confidence, reasoning}                    │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. BUILD SHORT ANSWER (TruthChecker.buildShortAnswer)          │
│    → Switch on verdict: likely_true/false/mixed/unverified/      │
│      scam_risk/insufficient_context                             │
│    → Short non-definitive text based on verdict                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. FORMAT REPORT (TruthReportFormatter.format)                  │
│    → publicReplyText: ≤320 chars, includes verdict label,        │
│      confidence, safety warning if scam                          │
│    → dashboardExplanation: 2-3 sentences for UI               │
│    → recommendedAction: based on verdict + risk level           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ (optional SafetyGate)
┌─────────────────────────────────────────────────────────────────┐
│ 13. SAFETY GATE + PERSIST (in API route)                        │
│    → If safetyGate.shouldBlockPublicReply() → skip reply        │
│    → Persist TruthCheck to DB via truthCheckRepository          │
│    → Return TruthReport to caller                               │
└─────────────────────────────────────────────────────────────────┘
```

## Key Interface: IFarcasterProvider

The evidence collector and context builder use `IFarcasterProvider`:

```typescript
interface IFarcasterProvider {
  getCastByHash(hash: string): Promise<Cast | null>;
  getReplies(hash: string, opts?: { limit?: number }): Promise<SearchResult<Cast>>;
  searchCasts(query: string, opts?: { limit?: number }): Promise<SearchResult<Cast>>;
}
```

**Important:** Use `getCastByHash()`, not `getCast()`. `searchCasts()` returns `SearchResult<Cast>` — access `.results` array.