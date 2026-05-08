# Phase 18: E2E Demo Scenarios

## Goal

Create demo scenarios that prove the product works end-to-end. Each major module should have a visible, runnable demonstration that can convince judges, investors, or developers of PULO's value.

## Scenarios

### Scenario 1: Basic Mention Summary

**Trigger:** User tags @pulo to summarize a thread

**Data:**
- Cast: "Hey @pulo summarize this thread please 🙏"
- Author: alice_farcaster (FID 100)
- Cast hash: demo_cast_mention_001

**Flow:**
1. Mention agent receives event
2. Fetches thread context
3. Generates summary with key points
4. Returns structured summary

**Expected Output:**
```json
{
  "topic": "New token $SUPERCOIN airdrop announcement",
  "participantCount": 3,
  "sentiment": "mixed (excitement + skepticism)",
  "keyPoints": [
    "User announced $SUPERCOIN airdrop",
    "Multiple users skeptical about legitimacy",
    "One user reported phishing attempt"
  ],
  "conclusion": "Highly suspicious - potential scam"
}
```

**Tests Demo:**
- Mention detection
- Context gathering
- LLM summarization
- Response formatting

---

### Scenario 2: Truth Check

**Trigger:** User asks "@pulo bu doğru mu?" on a suspicious cast

**Data:**
- Token claim cast with fake airdrop
- Two comment casts (one skeptical, one scam report)
- Links to suspicious domains

**Flow:**
1. Truth agent receives check request
2. Gathers evidence from comments
3. Analyzes claim against known data
4. Returns verdict with confidence and risk level

**Expected Output:**
```json
{
  "claim": "New token $SUPERCOIN is giving airdrop",
  "verdict": "uncertain",
  "confidence": 45,
  "riskLevel": "high",
  "evidenceSummary": "Multiple accounts promoting. No official source.",
  "counterEvidenceSummary": "One claim with no link. Domain recently registered.",
  "sourceCount": 2,
  "status": "completed"
}
```

**Tests Demo:**
- Multi-source evidence gathering
- Claim analysis
- Risk assessment
- Verdict classification

---

### Scenario 3: Radar Trend Detection

**Trigger:** Multiple trusted users discuss $GRASS season 2 rewards

**Data:**
- 3 casts from trusted users (alice, bob)
- Trend keywords: $GRASS, season 2, rewards, airdrop
- All sources have high trust scores (80+)

**Flow:**
1. Radar agent detects pattern
2. Calculates velocity and confidence
3. Creates trend record (status: detected)
4. Admin approves via admin UI
5. Alert created for matching users

**Expected Output:**
```
Trend: $GRASS Season 2 Rewards
  Category: reward_program
  Score: 75 | Velocity: 15
  Sources: 3 | Trusted: 2
  Status: detected → approved
Alert: Sent to alice (FID 100)
```

**Tests Demo:**
- Trend detection algorithm
- Velocity calculation
- Admin approval workflow
- Alert creation and delivery

---

### Scenario 4: Scam Warning

**Trigger:** Multiple low-trust accounts share similar phishing links

**Data:**
- 3 casts from new_user_anon (low trust)
- Similar text patterns ("FREE ETH", "double your ETH")
- 3 different suspicious domains

**Flow:**
1. Radar agent detects high-risk pattern
2. All sources have low trust scores (<30)
3. Suspicious link detection flags domains
4. Trend created with riskLevel: critical
5. Admin notified (auto-escalation possible)
6. Alert sent ONLY to users who opted into scam warnings

**Expected Output:**
```
🚨 CRITICAL: FREE ETH Scam Campaign
  Sources: 3 | Trusted: 0
  Domains: fake_metamask-wallet.xyz, scam-wallet-verify.xyz, eth-giveaway-scam.xyz
  Alert: scam_warning sent to 2 opted-in users
```

**Tests Demo:**
- High-risk pattern detection
- Suspicious link flagging
- Low-trust source handling
- Opt-in consent enforcement
- Critical alert prioritization

---

### Scenario 5: Composer Draft

**Trigger:** User writes weak cast, requests improvement

**Data:**
- Weak cast from pulo_demo (FID 999)
- Text: "what do you guys think about this crypto thing..."

**Flow:**
1. Composer receives rewrite request
2. Generates multiple style variants
3. Scores each variant
4. Saves best version as draft

**Expected Output:**
```json
{
  "variants": [
    {
      "text": "Been researching this project for weeks...",
      "style": "founder",
      "score": 72,
      "reasoning": "Added structure, addressed uncertainty"
    },
    {
      "text": "Hot take: if you're asking in a public cast...",
      "style": "sharp",
      "score": 68,
      "reasoning": "Direct, provokes thought"
    }
  ],
  "savedDraft": {
    "text": "Been researching this project...",
    "status": "pending",
    "score": 72
  }
}
```

**Tests Demo:**
- Style transfer (casual → professional/witty/founder)
- Quality scoring (0-100)
- Draft persistence
- Multiple variant generation

---

### Scenario 6: Plan Limit

**Trigger:** Free user exceeds daily truth check limit

**Data:**
- User: crypto_trader (FID 102, free plan)
- Current usage: 5/5 truth checks
- Request: One more truth check

**Flow:**
1. Safety gate checks user's plan limits
2. Daily limit (5) already reached
3. Request blocked with PLAN_LIMIT_EXCEEDED
4. User-facing message with upgrade CTA

**Expected Output:**
```json
{
  "error": "PLAN_LIMIT_EXCEEDED",
  "code": "TRUTH_CHECK_DAILY_LIMIT",
  "message": "Daily truth check limit reached",
  "limit": 5,
  "used": 5,
  "upgradeUrl": "/billing/upgrade",
  "userFacingMessage": "You've reached your daily truth check limit (5/5) on the free plan. Upgrade to Pro for unlimited truth checks."
}
```

**Tests Demo:**
- Plan tier enforcement
- Daily rate limiting
- Graceful error handling
- Upgrade funnel

---

## Implementation Details

### Demo Scripts

| Script | Purpose |
|--------|---------|
| `scripts/demo-seed.mjs` | Populate database with demo data |
| `scripts/demo-run.mjs` | Execute demo scenarios |
| `scripts/demo-reset.mjs` | Clear demo data |

### Package.json Commands

```json
{
  "demo:seed": "node scripts/demo-seed.mjs",
  "demo:run": "node scripts/demo-run.mjs",
  "demo:reset": "node scripts/demo-reset.mjs"
}
```

### Admin UI

Path: `/admin/system/demo`

Features:
- Seed demo data button
- Run all scenarios button
- Reset demo button
- Scenario cards showing each demo
- Run results display

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/demo/seed` | POST | Trigger demo seeding |
| `/api/admin/demo/run-scenario` | POST | Run specific scenario |
| `/api/admin/demo/reset` | POST | Clear demo data |
| `/api/admin/demo/status` | GET | Get demo status |

## Test Coverage

Integration tests verify:
- Each scenario can be seeded
- Each scenario produces expected output
- Demo reset clears all demo data
- Admin UI buttons trigger correct actions

```typescript
// e2e/demo.test.ts
describe('Demo Scenarios', () => {
  it('seeds all demo data', async () => { ... });
  it('runs scenario 1: mention summary', async () => { ... });
  it('runs scenario 2: truth check', async () => { ... });
  it('runs scenario 3: radar trend', async () => { ... });
  it('runs scenario 4: scam warning', async () => { ... });
  it('runs scenario 5: composer', async () => { ... });
  it('runs scenario 6: plan limit', async () => { ... });
  it('resets demo data', async () => { ... });
});
```

## Acceptance Criteria

1. **Demo is runnable** - `pnpm demo:seed && pnpm demo:run` works
2. **Every module visible** - Each of 6 scenarios demonstrates a different module
3. **Clean output** - Clear console output showing what happened
4. **Admin UI works** - Buttons trigger correct actions
5. **Reset works** - `pnpm demo:reset` clears all demo data
6. **Tests pass** - E2E tests verify all scenarios

## Files Created

```
scripts/demo-seed.mjs       # Seed demo data
scripts/demo-run.mjs        # Run scenarios
scripts/demo-reset.mjs      # Reset demo
apps/web/src/app/(admin)/admin/system/demo/page.tsx  # Admin UI
apps/api/src/routes/admin.ts # Demo API routes
docs/runbooks/DEMO_SCRIPT.md # Usage guide
docs/runbooks/DEMO_DATA.md   # Data reference
plan/phases/PHASE_18_E2E_DEMOS.md  # This file
```