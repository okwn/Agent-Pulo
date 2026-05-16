# Truth Check API

## Endpoints

### POST /api/truth/check

Run a truth check on a target cast. Returns a `TruthReport`.

**Request body:**
```typescript
{
  targetCastHash: string;      // required — hash of cast to check
  targetCastText: string;      // required — text content of cast
  targetAuthorFid?: number;     // optional — author FID
  userId?: number;              // optional — requesting user
  userPlan?: 'free'|'pro'|'creator'|'admin';
  fid?: number;                 // optional — requesting FID
}
```

**Response:**
```typescript
{
  id: string;                  // DB ID after persistence
  targetCastHash: string;
  targetCastText: string;
  targetAuthorFid: number;
  verdict: 'likely_true' | 'likely_false' | 'mixed' | 'unverified' | 'scam_risk' | 'insufficient_context';
  confidence: number;          // 0-1
  shortAnswer: string;          // 1-2 sentence answer
  dashboardExplanation: string; // 2-3 sentence explanation
  evidenceSummary: EvidenceSummary;
  riskAssessment: RiskAssessment;
  recommendedAction: 'safe_to_share' | 'verify_first' | 'do_not_share' | 'report' | 'cannot_determine';
  publicReplyText: string;     // ≤320 chars
  sourceCasts: string[];       // cast hashes used
  sourcesChecked: string[];    // sources assessed
  processingTimeMs: number;
  createdAt: string;            // ISO timestamp
}
```

**Errors:**
- `400` — invalid request body
- `500` — truth check failed (safety block or internal error)

**Notes:**
- Result is persisted to DB via `truthCheckRepository`
- SafetyGate runs pre/post checks before any publish
- Uses `createSearchProvider()` to get `WebSearchProvider`

---

### GET /api/truth/:id

Fetch a specific truth check report by ID.

**Response:** Same shape as above minus persistence fields.

**Errors:**
- `400` — missing ID
- `404` — truth check not found

---

### GET /api/admin/truth-checks

List recent truth checks (admin only).

**Query params:**
- `limit` — max results (default 50, max 100)
- `offset` — pagination offset (default 0)
- `verdict` — filter by verdict
- `riskLevel` — filter by risk level

**Response:**
```typescript
{
  data: TruthCheckRecord[];
  total: number;
  limit: number;
  offset: number;
}
```

---

### POST /api/truth/detect-intent

Detect if text contains a truth-check query (no DB persistence).

**Request body:**
```typescript
{ text: string; }
```

**Response:**
```typescript
{
  detected: boolean;
  queryLanguage?: 'en' | 'tr' | 'unknown';
  patterns: string[];        // which patterns matched
  confidence: number;
}
```

---

## Web Search Provider Wiring

`TruthChecker` is constructed with both providers:

```typescript
const truthChecker = new TruthChecker({
  farcasterProvider: getProvider(),
  searchProvider: createSearchProvider(),
});
```

`createSearchProvider()` reads `PULO_SEARCH_MODE`:
- `tavily` → TavilySearchProvider (requires `TAVILY_API_KEY`)
- `serpapi` → SerpApiSearchProvider (requires `SERPAPI_API_KEY`)
- `disabled` → DisabledSearchProvider
- `mock` / unset → MockSearchProvider

When in live mode (`PULO_FARCASTER_MODE=live`), real providers are used. In mock mode, both providers fall back to mock implementations.

## EvidenceSummary Shape

```typescript
{
  supporting_casts: EvidenceItem[];    // casts supporting the claim
  contradicting_casts: EvidenceItem[];  // casts contradicting the claim
  official_sources: EvidenceItem[];     // official project sources
  high_trust_users: EvidenceItem[];     // high-trust user casts
  suspicious_patterns: EvidenceItem[];   // casts with suspicious signals
  missing_evidence: string[];           // descriptions of evidence not found
}
```

## Recommended Actions

| Verdict | Risk | Action |
|---------|------|--------|
| `likely_true` | low | `safe_to_share` |
| `likely_true` | medium/high | `verify_first` |
| `likely_false` | any | `do_not_share` |
| `scam_risk` / critical | any | `do_not_share` |
| `mixed` / `unverified` | any | `cannot_determine` |
| `insufficient_context` | any | `cannot_determine` |