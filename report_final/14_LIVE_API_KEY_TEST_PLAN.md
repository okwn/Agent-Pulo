# 14_LIVE_API_KEY_TEST_PLAN.md

## Status: 📋 READY — Sequential Test Plan for Live Key Activation

## Purpose

This plan defines the exact sequence to activate live API keys and validate each PULO component end-to-end before declaring the system production-ready.

## Prerequisites

Before starting, ensure:
- `pnpm typecheck` passes
- `pnpm test` passes (45/45)
- `pnpm build` passes
- `docker compose ps` shows all services healthy
- `curl http://localhost:4311/health` returns `{"status":"ok"}`

## Environment Variables Required

```bash
# .env additions for live mode
PULO_FARCASTER_MODE=live
PULO_LLM_MODE=openai          # or "anthropic" or "auto"
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-... # needed for auto or anthropic mode
NEYNAR_API_KEY=your_key_here
DEMO_AUTH_SECRET=<strong-random-secret>
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Phase 1: Single-Provider LLM Test (No Neynar)

**Goal:** Verify OpenAI (or Anthropic) LLM works end-to-end in composer.

**Steps:**

```bash
# 1. Set env and restart API
export PULO_LLM_MODE=openai
export OPENAI_API_KEY=sk-...
docker compose restart api

# 2. Wait for health
sleep 5
curl http://localhost:4311/health

# 3. Test composer rewrite
curl -X POST http://localhost:4311/api/composer/rewrite \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello farcaster world","style":"founder"}'
# Expected: structured JSON with rewritten text from GPT-4o

# 4. Verify no fallback (primary succeeded)
# Check logs or response for fallbackHistory

# 5. Test truth check with real LLM
curl -X POST http://localhost:4311/api/truth \
  -H "Content-Type: application/json" \
  -d '{"castHash":"test","text":"This is a test claim about crypto"}'
# Expected: structured JSON with verdict/evidence/riskLevel
```

**Success Criteria:**
- [ ] Composer rewrite returns GPT-4o response (not mock)
- [ ] Truth check returns Claude/GPT response (not mock)
- [ ] No `LLM_PARSE_ERROR` in response
- [ ] `pnpm test` still passes

---

## Phase 2: Auto-Fallback LLM Test

**Goal:** Verify primary fails and fallback activates correctly.

**Steps:**

```bash
# 1. Set auto mode with both keys
export PULO_LLM_MODE=auto
export PULO_AUTO_PRIMARY=openai
export OPENAI_API_KEY=sk-...     # Set but will make it fail
export ANTHROPIC_API_KEY=sk-ant-...  # Fallback
docker compose restart api

# 2. Force primary to fail by setting invalid key temporarily
# (Alternatively use network to simulate primary failure)
export OPENAI_API_KEY=sk-invalid-key-force-fallback
docker compose restart api

# 3. Test — should fall back to Anthropic
curl -X POST http://localhost:4311/api/composer/rewrite \
  -H "Content-Type: application/json" \
  -d '{"text":"test cast","style":"concise"}'
# Expected: response from Claude (fallback), not GPT

# 4. Check fallbackHistory in response or logs
```

**Success Criteria:**
- [ ] Primary failure triggers fallback automatically
- [ ] Response comes from fallback provider
- [ ] `fallbackHistory` array shows primary failure reason
- [ ] System continues without crash

---

## Phase 3: Neynar API Key — Stream Test (No Posting)

**Goal:** Verify Neynar key is valid and can fetch cast data.

**Steps:**

```bash
# 1. Set to live mode
export PULO_FARCASTER_MODE=live
export NEYNAR_API_KEY=your_key_here
docker compose restart api

# 2. Wait for health
sleep 5
curl http://localhost:4311/health

# 3. Test Neynar cast fetch (via radar or truth check route)
curl "http://localhost:4311/api/radar/trends" \
  -H "Cookie: pulo_demo_session=..."
# This should attempt to fetch real cast data from Neynar

# 4. Check API logs for Neynar errors
docker compose logs api 2>&1 | grep -i "neynar\|error" | tail -20
```

**Success Criteria:**
- [ ] Neynar API calls succeed (no 401/403 errors in logs)
- [ ] Cast data appears in responses
- [ ] Radar trends show real data (not seeded mock)

**If Neynar key is wrong:**
- Logs show `401` or `403` from `api.neynar.com`
- Fix: Get valid key from [neynar.com](https://neynar.com)

---

## Phase 4: End-to-End User Flow

**Goal:** A real user can sign in, analyze a cast, and receive an alert.

**Steps:**

```bash
# 1. Set all live keys
export PULO_FARCASTER_MODE=live
export PULO_LLM_MODE=openai
export NEYNAR_API_KEY=...
export OPENAI_API_KEY=...
docker compose restart api

# 2. Open browser: http://localhost:3100
# Navigate to /composer
# Enter a real cast URL or text
# Submit for analysis

# 3. Verify:
# - Real LLM analysis returned
# - Result stored in DB
# - No errors in API logs
```

**Success Criteria:**
- [ ] Real user can complete composer flow with live LLM
- [ ] Truth check stored in DB with real verdict
- [ ] Radar detects trend (if cast has sufficient engagement)

---

## Phase 5: Admin Panel — Live Data

**Goal:** Admin sees real data from live API calls.

**Steps:**

```bash
# 1. Log in as admin (demo or SIWF when implemented)
open http://localhost:3100/admin/login
Click "Demo Login"

# 2. Navigate /admin/radar
# Verify trends are from live Neynar stream (not seeded mock)

# 3. Navigate /admin/truth-checks
# Verify real LLM truth checks listed

# 4. Navigate /admin/events
# Verify agent_events shows real LLM calls (not mock)
```

**Success Criteria:**
- [ ] Admin pages show live data (not demo seed data)
- [ ] Safety flags from real content appear
- [ ] Admin can approve/reject real trends

---

## Phase 6: Production Safety Validation

**Goal:** Confirm safety gates work correctly on real content.

**Steps:**

```bash
# 1. Submit a high-risk cast (scam/promotional content)
curl -X POST http://localhost:4311/api/truth \
  -H "Content-Type: application/json" \
  -d '{"castHash":"real_hash","text":"FREE NFT DROP urgent click link telegram.com"}'

# 2. Verify response:
# - riskLevel is "high" or "critical"
# - SafetyGate returned "block" (if above threshold)

# 3. Check admin safety page
open http://localhost:3100/admin/safety
# Flag should appear for manual review or block
```

**Success Criteria:**
- [ ] High-risk content flagged correctly
- [ ] Scam links detected via URL analysis
- [ ] Safety threshold configurable via `PULO_SAFETY_THRESHOLD`

---

## Rollback Plan

If any phase fails:

```bash
# 1. Revert to mock mode
export PULO_FARCASTER_MODE=mock
export PULO_LLM_MODE=mock
docker compose restart api

# 2. Verify system is healthy
curl http://localhost:4311/health

# 3. Investigate failure in isolated mock mode
# 4. Re-run phase with fix applied
```

---

## Final Verdict

**After Phase 6:**
- All phases pass → **READY_FOR_PRODUCTION**
- Phase 3+ fails → **BLOCKED_ON_KEYS** (fix Neynar key first)
- Phase 1+2 fails → **BLOCKED_ON_LLM** (fix LLM key first)
- Safety fails → **BLOCKED_ON_SAFETY_TUNING** (adjust thresholds)

---

## Commands Summary

```bash
# Pre-flight check
pnpm typecheck && pnpm test && pnpm build
docker compose ps
curl http://localhost:4311/health

# Phase 1: OpenAI
export PULO_LLM_MODE=openai OPENAI_API_KEY=sk-...
docker compose restart api
curl -X POST http://localhost:4311/api/composer/rewrite -H "Content-Type: application/json" -d '{"text":"test","style":"founder"}'

# Phase 2: Auto-fallback
export PULO_LLM_MODE=auto PULO_AUTO_PRIMARY=openai OPENAI_API_KEY=sk-invalid ANTHROPIC_API_KEY=sk-ant-...
docker compose restart api

# Phase 3: Neynar
export PULO_FARCASTER_MODE=live NEYNAR_API_KEY=...
docker compose restart api

# Phase 4-6: Full end-to-end (manual browser testing)

# Rollback
export PULO_FARCASTER_MODE=mock PULO_LLM_MODE=mock
docker compose restart api
```