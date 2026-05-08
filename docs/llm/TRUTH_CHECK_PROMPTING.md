# TRUTH_CHECK_PROMPTING.md — Truth Check Prompt Engineering

**Status:** Complete

## Two-Step Architecture

Truth checking uses a two-step pipeline:

1. **Claim Extraction** (`truth_check_claim_extraction`) — small model
2. **Verdict Generation** (`truth_check_verdict`) — large model

## Step 1: Claim Extraction

**Model Tier:** small (`gpt-4o-mini`)

**Goal:** Identify the single most verifiable factual claim from a potentially opinion-laden cast.

**Prompt excerpt:**
```
You are a claim extractor for fact-checking. Given a cast, extract all testable factual claims.

Return a JSON object with:
- claim: the main verifiable claim extracted from the cast
- claimCategory: category of the claim (factual/opinion/prediction/unstated)
- urgency: how important it is to verify this claim (low/medium/high)
- contextNeeded: array of specific questions that would help verify this claim
- confidence: how confident you are that this claim is the main one to verify (0-1)
```

**Key techniques:**
- Extract specific claims (prices, dates, percentages, names) not opinions
- Rate urgency based on potential impact of the claim being false
- Provide context questions that a fact-checker could answer

## Step 2: Verdict Generation

**Model Tier:** large (`gpt-4o`)

**Goal:** Produce a well-reasoned verdict with supporting evidence.

**Prompt excerpt:**
```
You are a fact-checker for decentralized social media. Given a claim and context, produce a verdict with supporting evidence.

Return a JSON object with:
- verdict: your assessment (likely_true/mixed/likely_false/false/unverifiable)
- confidence: your confidence in this verdict (0-1)
- shortAnswer: a 1-sentence answer to the original claim
- dashboardExplanation: a 2-3 sentence explanation suitable for a dashboard display
- supportingSignals: array of evidence or sources that support the claim
- contradictingSignals: array of evidence or sources that contradict the claim
- evidenceCastHashes: array of cast hashes that provide relevant evidence
- sourcesChecked: array of sources you consulted to form this verdict
```

**Key techniques:**
- Use official sources first (Ethereum Foundation blog, CoinGecko, on-chain data)
- Distinguish between `likely_true` and `unverifiable` — not everything can be definitively proven
- Provide cast hashes for evidence when available (enables traceability)
- Set confidence appropriately — 0.85 not 1.0 for most claims

## Verdict Scale

| Verdict | Meaning |
|---|---|
| `likely_true` | Strong evidence supports the claim |
| `mixed` | Evidence is evenly balanced |
| `likely_false` | Strong evidence contradicts the claim |
| `false` | Claim is definitively false (rare in crypto) |
| `unverifiable` | Insufficient information to assess |

## Cost Optimization

- Claim extraction uses `gpt-4o-mini` (~$0.15/M input tokens)
- Verdict generation uses `gpt-4o` only when needed, for complex claims
- For simple verifiable facts, a single `likely_true` verdict is sufficient
- Do not run verdict step for opinion or prediction categories

## Testing Prompts

```typescript
import { MockLlmProvider } from '@pulo/llm';

const provider = new MockLlmProvider();
provider.setMockResponse('truth_check_verdict', {
  verdict: 'likely_true',
  confidence: 0.87,
  shortAnswer: 'Yes — Ethereum completed its Merge to proof-of-stake in September 2022.',
  dashboardExplanation: 'The Merge was confirmed by official sources.',
  supportingSignals: ['Ethereum Foundation blog'],
  contradictingSignals: [],
  evidenceCastHashes: [],
  sourcesChecked: ['ethereum.org'],
});

const result = await provider.complete(messages, TruthCheckVerdictSchema);
```
