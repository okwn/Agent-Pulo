# Composer Specification

PULO Composer helps users craft better casts with AI-powered enhancements.

## Vision

The composer should feel like having a skilled social media advisor watching over your shoulder — suggesting improvements, catching issues, and helping you write casts that resonate.

## Features

### 1. Compose Mode

**Core editing:**
- Large textarea for cast composition
- Character count (320 max)
- Save as draft button
- Direct publish button

**Enhancement tools:**
- Rewrite in different styles
- Build thread from content
- Rate cast quality
- Score and improve hook
- Recommend channels
- Translate EN/TR
- Safety check

### 2. Rewrite Styles

| Style | When to Use |
|-------|-------------|
| **Sharper** | When you want punchy, no-filler prose |
| **Founder** | Professional but personable, like a startup founder |
| **Technical** | When accuracy and specifics matter |
| **Funnier** | Lighthearted content, memes |
| **Concise** | Twitter-style brevity |
| **Thread** | Convert to compelling thread opener |

### 3. Thread Builder

- Input: longer-form content
- Output: structured thread with 2-10 posts
- First post marked as "hook"
- Shows character count per post
- Copy button for full thread

### 4. Cast Rating

Scores (1-10):
- **Hook** - Does it grab attention?
- **Clarity** - Is it easy to understand?
- **Engagement** - Will it drive interaction?

Also provides:
- Overall score
- Critique summary
- Improvement suggestions
- Risk flags (financial claims, etc.)

### 5. Hook Suggestions

Types:
- **Question** - Engages through inquiry
- **Number** - "3 things..." style
- **Controversy** - Bold takes
- **Statement** - Direct claims

### 6. Channel Recommendations

Suggests relevant Warpcast channels based on content keywords:
- degen (trading/DeFi)
- dev (technical)
- farcaster (general)
- etc.

Shows follower count for context.

### 7. Translation

- English ↔ Turkish
- Simple mock prefix `[TR]` for demo
- In production would use translation API

### 8. Safety Check

**Blocking issues:**
- Spam patterns ("buy now", "click here", "limited time")
- Guarantee language

**Warnings:**
- Long casts (>320 chars)
- Excessive caps
- Contains links
- Disclaimer language

### 9. Draft Queue

**States:**
- `draft` - Initial state, can edit/publish/ignore
- `approved` - Reviewed and approved (future: auto-approve)
- `published` - Successfully published
- `ignored` - Intentionally ignored

**Actions:**
- Edit (load into composer)
- Publish (with safety check)
- Ignore (move to ignored)
- Delete

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Composer                                    [Save Draft] [Publish] │
├───────────────────────────────────────┬─────────────────────────┤
│  [Write] [Rewrite] [Thread]            │  Draft Queue (5)        │
├───────────────────────────────────────┤                         │
│  ┌─────────────────────────────────┐  │  ┌─────────────────────┐ │
│  │ What's on your mind?            │  │  │ Draft text preview   │ │
│  │                                 │  │  │ Status: draft        │ │
│  │                                 │  │  │ [Edit] [Publish]     │ │
│  └─────────────────────────────────┘  │  └─────────────────────┘ │
│  [🌐 EN/TR] [✓ Check Safety]          │                         │
│                                       │  ┌─────────────────────┐ │
│  ┌─────────────────────────────────┐  │  │ Another draft...     │ │
│  │ Enhance:                        │  │  │ Status: published    │ │
│  │ [Sharpen] [Founder] [Tech] ...  │  │  └─────────────────────┘ │
│  │ [All Variants] [Build Thread]   │  │                         │
│  └─────────────────────────────────┘  │                         │
│                                       │                         │
│  ┌─────────────────────────────────┐  │                         │
│  │ Rewrite Variants                │  │                         │
│  │ ┌─────────────────────────────┐│  │                         │
│  │ │ Sharp (8.5)                  ││  │                         │
│  │ │ Rewritten text...           ││  │                         │
│  │ └─────────────────────────────┘│  │                         │
│  └─────────────────────────────────┘  │                         │
└───────────────────────────────────────┴─────────────────────────┘
```

## Future Enhancements

1. **Auto-draft on type** - Save drafts automatically
2. **Reply context** - Reply to specific cast with composer
3. **Media attachments** - Support images
4. **Schedule posts** - Queue for later
5. **A/B variants** - Test different hooks
6. **Trending hooks** - Learn from successful casts
7. **Real translation API** - Google Translate / DeepL
8. **Channel analytics** - Performance by channel