# Truth Analysis — Error Reference

## Error Codes

### TruthChecker Errors

| Code | Condition | Likely Cause |
|---|---|---|
| `EVIDENCE_COLLECTOR_FAILED` | Evidence collection threw | IFarcasterProvider unavailable or rate limited |
| `VERDICT_ENGINE_ERROR` | Verdict production failed | Malformed input from prior steps |
| `CONTEXT_BUILD_FAILED` | Context building failed | Missing parentHash, provider errors |
| `REPLY_ANALYZER_ERROR` | Reply analysis threw | Empty replies array passed |
| `SOURCE_SCORER_ERROR` | Source scoring threw | Malformed SourceAssessment in output |

### API Errors

| Status | Error | Description |
|---|---|---|
| `400` | `Invalid request` | Missing required fields, bad types |
| `404` | `Truth check not found` | ID doesn't exist in DB |
| `500` | `Truth check failed` | Internal error in TruthChecker.run() |

### SafetyGate Errors

These do NOT throw — they are logged and return `null` or safe defaults.

| Condition | Behavior |
|---|---|
| `shouldBlockPublicReply()` returns true | Public reply is generated but not published; `recommendedAction` set to `do_not_share` |
| `shouldBlockDashboard()` returns true | Dashboard view is obscured, replaced with generic message |
| Consent not given | Results are returned to user only, not persisted or published |

### Common TypeScript Errors

**`getCast` not found on IFarcasterProvider:**
→ Use `getCastByHash(hash: string)` instead

**`searchCasts()` not iterable:**
→ Use `searchResult.results` array from returned `SearchResult<Cast>`

**`Object is possibly 'undefined'` on array access:**
→ Use non-null assertion: `scored[0]!.text`

**`truthCheckRepository` not exported from `@pulo/db`:**
→ Add `export { truthCheckRepository } from './repositories/truth.js'` in `packages/db/src/index.ts`

### Intent Detection Edge Cases

- Cast with both EN and TR patterns → first matched language wins
- Pattern at end of text boosts confidence by +0.1
- Question mark boosts confidence by +0.05
- `confidence` capped at 1.0

### Scam Detection Edge Cases

- If no scam keywords found → risk level is `low` regardless of other signals
- Scam signals are additive — multiple small signals can trigger `medium`/`high`
- `scam_risk` verdict has priority override in verdict engine (checked first)