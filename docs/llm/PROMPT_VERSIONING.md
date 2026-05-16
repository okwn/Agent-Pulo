# PROMPT_VERSIONING.md — Prompt Versioning System

## Structure

Prompts live in `packages/llm/prompts/*.md`. Each file is named `{runType}.md`.

## Frontmatter Schema

```yaml
---
version: 1.0.0
runType: farcaster_reply
description: Generates a reply cast in response to a user mention
modelTier: large
outputSchema: |
  {
    text: string (max 320 chars),
    channelId: string | null,
    tone: string
  }
safetyNotes: |
  - Never reveal AI identity unless directly asked
  - Enforce 320 character limit
minConfidence: 0.7
---
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| `version` | Yes | Semver string |
| `runType` | Yes | Maps to LlmRunType |
| `description` | Yes | One-line purpose description |
| `modelTier` | Yes | `small` or `large` |
| `outputSchema` | Yes | JSON Schema notation of expected output |
| `safetyNotes` | Yes | Safety constraints for the model |
| `minConfidence` | No | Minimum confidence threshold |

## Loading Prompts

```typescript
import { loadPrompt, getPromptMetadata } from '@pulo/llm';

// Load and render
const template = loadPrompt('farcaster_reply');
const rendered = template.render({ name: 'Alice' });

// Get metadata only (no file read)
const meta = getPromptMetadata('intent_classification');
```

## Version Tracking

Prompt version is stored in `agent_runs.prompt_version` when a run executes. This enables:
- Reproducibility: replay runs with exact prompt version
- Audit: track which prompt version produced which output
- Rollback: revert to prior version if issues detected

## Multiline Fields

`outputSchema` and `safetyNotes` use YAML pipe (`|`) multiline syntax. The parser handles this correctly.