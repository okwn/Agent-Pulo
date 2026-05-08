# Demo Script

Run PULO's demo scenarios to showcase all major features.

## Prerequisites

```bash
# Ensure stack is running
pnpm dev:local

# Seed demo data first
pnpm demo:seed
```

## Commands

```bash
# Run all demo scenarios
pnpm demo:run

# Run specific scenario
pnpm demo:run --scenario 1

# Reset demo data
pnpm demo:reset
```

## Demo Scenarios

### Scenario 1: Basic Mention Summary

**Flow:**
1. User casts: "Hey @pulo summarize this thread please 🙏"
2. PULO receives mention event
3. Mention agent generates summary
4. Summary includes: topic, participant count, sentiment, key points

**Trigger:**
```bash
pnpm demo:run --scenario 1
```

**What it shows:**
- Mention detection and processing
- Thread summarization capability
- Response format and quality

---

### Scenario 2: Truth Check

**Flow:**
1. Cast claims token airdrop is live
2. Comments show mixed reactions
3. One comment: "official source missing"
4. Another: suspicious link shared
5. User asks "@pulo bu doğru mu?" (Turkish: "is this true?")
6. PULO returns: uncertain verdict, high risk, evidence summary

**Trigger:**
```bash
pnpm demo:run --scenario 2
```

**What it shows:**
- Multi-source evidence gathering
- Verdict classification (verified/likely_true/uncertain/likely_false/debunked)
- Risk level assessment (low/medium/high/critical)
- Evidence summary display

---

### Scenario 3: Radar Trend Detection

**Flow:**
1. Multiple casts discuss $GRASS season 2 rewards
2. Trusted users share confirmation
3. PULO detects trend
4. Admin approves trend
5. Alert created for matching users

**Trigger:**
```bash
pnpm demo:run --scenario 3
```

**What it shows:**
- Trend detection algorithm
- Velocity and confidence scoring
- Admin approval workflow
- Alert creation and delivery

---

### Scenario 4: Scam Warning

**Flow:**
1. Multiple low-trust accounts share similar claim
2. Phishing links identified
3. PULO detects high-risk pattern
4. Scam warning trend created
5. Alert sent ONLY to users opted into scam warnings

**Trigger:**
```bash
pnpm demo:run --scenario 4
```

**What it shows:**
- High-risk pattern detection
- Safety agent escalation
- Opt-in consent enforcement
- Critical alert priority handling

---

### Scenario 5: Composer Draft

**Flow:**
1. User writes weak cast
2. PULO generates improved versions (founder, sharp, technical)
3. Best version selected and saved as draft

**Trigger:**
```bash
pnpm demo:run --scenario 5
```

**What it shows:**
- Style transfer (casual → professional)
- Quality scoring (0-100)
- Draft management
- Composer UI in web app

---

### Scenario 6: Plan Limit

**Flow:**
1. Free user at 5/5 daily truth check limit
2. Attempts another truth check
3. PULO blocks gracefully
4. Upgrade CTA displayed

**Trigger:**
```bash
pnpm demo:run --scenario 6
```

**What it shows:**
- Plan tier enforcement
- Rate limiting (daily limits)
- Graceful error handling
- Upgrade funnel

---

## Running via Admin UI

Open http://localhost:3000/admin/system/demo

Buttons:
- **Seed Demo Data** - Populate database with demo scenarios
- **Run All Scenarios** - Execute all 6 scenarios sequentially
- **Reset Demo** - Clear demo data

## Expected Output

```
🎬 PULO Demo Runner

════════════════════════════════════════
Starting all demo scenarios...

📝 SCENARIO 1: Basic Mention Summary
───────────────────────────────────────
✨ PULO Summary:
{
  "topic": "New token $SUPERCOIN airdrop",
  "participantCount": 3,
  "sentiment": "mixed",
  "keyPoints": [...]
}

🔍 SCENARIO 2: Truth Check
───────────────────────────────────────
⚠️  VERDICT: UNCERTAIN → HIGH RISK

✍️  SCENARIO 5: Composer
───────────────────────────────────────
💾 Saving best version as draft...

🎉 Demo Complete!
```

## CI/CD Integration

For automated demos:

```bash
# Scripted demo for investors/judges
#!/bin/bash
set -e

pnpm demo:reset
pnpm demo:seed
pnpm demo:run

echo "Demo completed successfully"
```