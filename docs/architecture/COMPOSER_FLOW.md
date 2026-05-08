# Composer Flow

The PULO Composer helps users craft, enhance, and publish casts to Warpcast.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Composer UI                              │
│  /dashboard/composer                                             │
│  - Write mode     - Rewrite mode     - Thread mode              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Composer API Routes                           │
│  POST /api/composer/rewrite    - Rewrite with style              │
│  POST /api/composer/thread     - Build thread                   │
│  POST /api/composer/rate       - Rate cast quality              │
│  POST /api/composer/hook-score - Score and suggest hooks        │
│  POST /api/composer/channels   - Recommend channels             │
│  POST /api/composer/translate  - Turkish/English translation     │
│  POST /api/composer/safety-check - Check publish safety         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Composer Agents                             │
│                                                                  │
│  CastRewriteAgent    - Transform text style                      │
│    ├── makeSharp()      Remove filler, add punch                │
│    ├── makeFounderStyle() Confident, direct                     │
│    ├── makeTechnical()  Add precision markers                   │
│    ├── makeFunny()      Add wit/humor                           │
│    ├── makeConcise()     Reduce word count                       │
│    └── makeThreadHook() Create thread opener                    │
│                                                                  │
│  ThreadBuilderAgent   - Split text into thread posts             │
│                                                                  │
│  CastRatingAgent      - Score clarity, hook, engagement          │
│                                                                  │
│  HookScorer           - Evaluate hooks, suggest improvements     │
│                                                                  │
│  ChannelRecommender   - Match text to Warpcast channels         │
│                                                                  │
│  PublishSafetyCheck   - Detect spam/risk patterns                │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Draft Queue                                 │
│  InMemoryDraftStore (singleton)                                  │
│  States: draft → approved → published / ignored                 │
│                                                                  │
│  POST /api/drafts/:id/publish  - Safety check before publish    │
│  POST /api/drafts/:id/ignore   - Move to ignored                 │
└─────────────────────────────────────────────────────────────────┘
```

## Flow: Write Mode

1. User types cast text
2. User can apply enhancements:
   - **Rewrite styles**: sharper, founder, technical, funny, concise, thread
   - **Rate Cast**: Get hook/clarity/engagement scores
   - **Score Hook**: Get hook improvement suggestions
   - **Channel Recommend**: Get relevant channels
   - **Translate**: EN/TR
   - **Safety Check**: Before publishing

3. User saves as draft or publishes directly

## Flow: Publish Safety

```
User clicks Publish
       │
       ▼
SafetyCheck.check(text)
       │
       ├── safe=true + warnings=[]
       │         └── Allow publish
       │
       ├── safe=true + warnings=[...]
       │         └── Show warnings, require confirmation
       │
       └── safe=false + issues=[...]
                 └── Block publish, show issues
```

## Draft Queue States

```
     ┌─────────┐
     │  draft  │ ← Created by saveDraft()
     └────┬────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌──────────┐
│ignored │  │ approved │ (future: auto-approve)
└────────┘  └────┬─────┘
                 │
                 ▼
           ┌──────────┐
           │ published│ ← publishDraft() sets publishedAt
           └──────────┘
```

## Style Transformations

| Style | Effect |
|-------|--------|
| sharp | Remove "I think", "basically", "really very" |
| founder | Replace hedging with confident statements |
| technical | Add [specify metrics/details] marker for short input |
| funny | Add wit markers like "(this is not financial advice)" |
| concise | Truncate to ~10 words |
| thread | Create thread opener (truncate to 100 chars) |

## Channel Matching

Channels are scored based on keyword matching:
- `degen`: trade, buy, sell, yield, farm
- `dev`: code, protocol, api, contract, defi
- `farcaster`: general content
- etc.

Returns top 5 channels with relevance scores 0-1.