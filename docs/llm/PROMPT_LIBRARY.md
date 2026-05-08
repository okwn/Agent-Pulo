# PROMPT_LIBRARY.md — Prompt Templates for LLM Run Types

**Status:** Complete

## Overview

Prompt templates are stored in `packages/llm/prompts/` as YAML-frontmatter Markdown files. Each template has metadata (version, runType, modelTier) followed by the prompt body.

## Prompt Files

| File | Run Type | Model Tier | Purpose |
|---|---|---|---|
| `intent_classifier.md` | `intent_classification` | small | Classifies cast intent into 10 categories |
| `farcaster_reply.md` | `farcaster_reply` | large | Generates reply cast text |
| `cast_summary.md` | `cast_summary` | small | Summarizes single cast |
| `thread_summary.md` | `thread_summary` | large | Summarizes thread with participant analysis |
| `truth_check_claim_extraction.md` | `truth_check_claim_extraction` | small | Extracts verifiable claims |
| `truth_check_verdict.md` | `truth_check_verdict` | large | Produces verdict with evidence assessment |
| `trend_cluster_summary.md` | `trend_cluster_summary` | small | Summarizes trend cluster |
| `risk_analysis.md` | `risk_analysis` | large | Assesses engagement risk |
| `alert_message.md` | `alert_message` | small | Generates alert notification |
| `admin_summary.md` | `admin_summary` | small | Generates admin dashboard summary |

## Loading Prompts

```typescript
import { loadPrompt } from '@pulo/llm';

// Load latest version
const template = loadPrompt('farcaster_reply');
const text = template.render({ castText: 'Hello world' });

// Load specific version
const v1 = loadPrompt('farcaster_reply', '1.0.0');
```

## Template Variables

Templates use `{{variableName}}` syntax for variable substitution:

```typescript
const template = loadPrompt('cast_summary');
template.render({
  castText: 'Ethereum just announced...',
  authorFid: '1234',
});
```

## Versioning

Prompts are versioned via frontmatter. When prompts evolve, increment the version field:

```yaml
---
version: 1.1.0
runType: farcaster_reply
description: Updated tone guidance
modelTier: large
---
```

Use `listPromptVersions(runType)` to discover available versions.

## Model Tier Routing

The `modelTier` field in each prompt must match the `RUN_TYPE_MODEL_MAP` configuration:

- `small` → `gpt-4o-mini` or `claude-haiku`
- `large` → `gpt-4o` or `claude-sonnet`

## Adding a New Prompt

1. Create `packages/llm/prompts/<run_type>.md`
2. Add YAML frontmatter with version, runType, description, modelTier
3. Write the prompt body with variable placeholders
4. Add to mock responses in `mock.ts` if needed
