# Truth Analysis API

## Endpoints

### POST /api/truth/check

Run a truth check on a target cast.

**Request:**
```json
{
  "targetCastHash": "0xabc123...",
  "targetCastText": "Is it true that $DEGEN airdrop is tomorrow?",
  "targetAuthorFid": 1234,
  "userId": 5678,
  "userPlan": "pro",
  "fid": 5678
}
```

| Field | Type | Required | Default |
|---|---|---|---|
| `targetCastHash` | `string` | Yes | — |
| `targetCastText` | `string` | Yes | — |
| `targetAuthorFid` | `number` | No | `0` |
| `userId` | `number` | No | `0` |
| `userPlan` | `'free' \| 'pro' \| 'creator' \| 'admin'` | No | `'free'` |
| `fid` | `number` | No | `targetAuthorFid` |

**Response (200):**
```json
{
  "targetCastHash": "0xabc123...",
  "targetCastText": "Is it true that $DEGEN airdrop is tomorrow?",
  "targetAuthorFid": 1234,
  "verdict": "unverified",
  "confidence": 0.35,
  "shortAnswer": "I found people discussing this, but there is no clear confirmation from official sources yet.",
  "dashboardExplanation": "This claim about a $DEGEN airdrop tomorrow could not be verified. No official announcements from the DEGEN team were found. Evidence is insufficient to determine accuracy.",
  "evidenceSummary": {
    "supporting_casts": [],
    "contradicting_casts": [],
    "official_sources": [],
    "high_trust_users": [],
    "suspicious_patterns": [],
    "missing_evidence": ["Official announcement from DEGEN team"]
  },
  "riskAssessment": {
    "overallRisk": "medium",
    "flags": [
      {
        "type": "scam",
        "severity": "medium",
        "description": "Airdrop claims with urgency are common scam vectors"
      }
    ],
    "summary": "This airdrop claim shows medium risk of being a scam. No official confirmation found.",
    "score": 0.45
  },
  "recommendedAction": "verify_first",
  "publicReplyText": "Pulo check: Unverified — I found people discussing this $DEGEN airdrop claim, but there's no clear confirmation from official sources. Proceed with caution and verify independently before engaging.",
  "sourceCasts": [],
  "sourcesChecked": [],
  "processingTimeMs": 234,
  "createdAt": "2026-05-08T12:34:56.789Z"
}
```

**Verdict values:** `likely_true` | `likely_false` | `mixed` | `unverified` | `scam_risk` | `insufficient_context`

**Risk levels:** `low` | `medium` | `high` | `critical`

**Recommended actions:** `safe_to_share` | `verify_first` | `do_not_share` | `report` | `cannot_determine`

**Error (400):**
```json
{
  "error": "Invalid request",
  "details": { "targetCastHash": ["Required"] }
}
```

**Error (500):**
```json
{
  "error": "Truth check failed",
  "message": "Error details"
}
```

---

### GET /api/truth/:id

Retrieve a specific truth check by ID.

**Response (200):**
```json
{
  "id": "uuid-here",
  "targetCastHash": "0xabc123...",
  "claimText": "Is it true that $DEGEN airdrop is tomorrow?",
  "verdict": "unverified",
  "confidence": 35,
  "evidenceSummary": "I found people discussing this, but there is no clear confirmation...",
  "riskLevel": "medium",
  "status": "completed",
  "sourceCastHashes": [],
  "createdAt": "2026-05-08T12:34:56.789Z"
}
```

**Error (404):**
```json
{ "error": "Truth check not found" }
```

---

### GET /api/admin/truth-checks

List recent truth checks with optional filters.

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `50` | Max results (≤100) |
| `offset` | `number` | `0` | Pagination offset |
| `verdict` | `string` | — | Filter by verdict |
| `riskLevel` | `string` | — | Filter by risk level |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "targetCastHash": "0xabc...",
      "claimText": "...",
      "verdict": "unverified",
      "confidence": 35,
      "riskLevel": "medium",
      "createdAt": "2026-05-08T12:34:56.789Z"
    }
  ],
  "total": 127,
  "limit": 20,
  "offset": 0
}
```

---

### POST /api/truth/detect-intent

Detect if a cast text contains a truth-check query.

**Request:**
```json
{
  "text": "Hey @pulo is this true? $DEGEN airdrop tomorrow"
}
```

**Response (200):**
```json
{
  "detected": true,
  "queryLanguage": "en",
  "patterns": ["is this true"],
  "confidence": 0.7
}
```

| Field | Type | Description |
|---|---|---|
| `detected` | `boolean` | Whether intent was found |
| `queryLanguage` | `'en' \| 'tr' \| 'unknown'` | Detected language |
| `patterns` | `string[]` | Matched patterns |
| `confidence` | `number` | Detection confidence (0-1) |