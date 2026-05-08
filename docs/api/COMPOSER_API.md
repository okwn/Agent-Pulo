# Composer API

## Endpoints

### POST /api/composer/rewrite

Rewrite text in a specified style.

**Request:**
```json
{
  "text": "I think that this is basically a great idea",
  "style": "sharp"
}
```

**Response:**
```json
{
  "variant": {
    "text": "This is a great idea.",
    "style": "sharp",
    "score": 8.5,
    "reasoning": "Make this cast sharper..."
  }
}
```

### POST /api/composer/rewrite-multiple

Get multiple style variants at once.

**Request:**
```json
{
  "text": "This is my cast content",
  "styles": ["sharp", "founder", "concise"]
}
```

**Response:**
```json
{
  "variants": [
    { "text": "...", "style": "sharp", "score": 8, "reasoning": "..." },
    { "text": "...", "style": "founder", "score": 7.5, "reasoning": "..." },
    { "text": "...", "style": "concise", "score": 9, "reasoning": "..." }
  ]
}
```

### POST /api/composer/thread

Build a thread from text.

**Request:**
```json
{
  "text": "Longer content that needs to be split into a thread...",
  "postCount": 5
}
```

**Response:**
```json
{
  "posts": [
    { "text": "Hook post...", "index": 0, "isHook": true },
    { "text": "Post 2...", "index": 1, "isHook": false },
    ...
  ],
  "totalLength": 1234,
  "hook": "Thread opener..."
}
```

### POST /api/composer/rate

Rate a cast's quality.

**Request:**
```json
{
  "text": "Your cast text here"
}
```

**Response:**
```json
{
  "score": 7.5,
  "critique": "Solid cast overall.",
  "suggestions": ["Add a call-to-action"],
  "hookScore": 8,
  "clarityScore": 7,
  "engagementScore": 7.5,
  "riskFlags": []
}
```

### POST /api/composer/hook-score

Score hook and suggest improvements.

**Request:**
```json
{
  "text": "Hook text to score"
}
```

**Response:**
```json
{
  "score": { "score": 8, "factors": ["Good hook length", "Starts with question"] },
  "suggestions": [
    { "hook": "Rephrased hook", "type": "question", "score": 8.5, "reasoning": "..." }
  ]
}
```

### POST /api/composer/channels

Get channel recommendations.

**Request:**
```json
{
  "text": "Content about DeFi protocol"
}
```

**Response:**
```json
{
  "recommendations": [
    { "channel": "degen", "relevance": 0.8, "reason": "Matches: defi", "followerCount": 85000 },
    { "channel": "dev", "relevance": 0.6, "reason": "Matches: protocol", "followerCount": 32000 }
  ]
}
```

### POST /api/composer/translate

Translate between English and Turkish.

**Request:**
```json
{
  "text": "Hello world",
  "targetLang": "tr"
}
```

**Response:**
```json
{
  "translated": "[TR] Hello world",
  "sourceLang": "en"
}
```

### POST /api/composer/safety-check

Check if text is safe to publish.

**Request:**
```json
{
  "text": "Check this out https://example.com"
}
```

**Response:**
```json
{
  "safe": true,
  "riskLevel": "medium",
  "issues": [],
  "warnings": ["Contains link - ensure it's safe"]
}
```

## Draft Endpoints

### GET /api/drafts

Get all drafts.

**Response:**
```json
{
  "drafts": [
    {
      "id": "draft_123",
      "text": "Draft content",
      "status": "draft",
      "score": 7.5,
      "reason": null,
      "sourceCastHash": null,
      "createdAt": "2026-05-08T10:00:00Z",
      "updatedAt": "2026-05-08T10:30:00Z",
      "publishedAt": null
    }
  ]
}
```

### POST /api/drafts

Create a new draft.

**Request:**
```json
{
  "text": "Draft content",
  "sourceCastHash": null
}
```

### PATCH /api/drafts/:id

Update a draft.

**Request:**
```json
{
  "text": "Updated content",
  "status": "approved",
  "score": 8,
  "reason": "Looks good"
}
```

### POST /api/drafts/:id/publish

Publish a draft (safety check required).

**Response:**
```json
{
  "success": true,
  "draft": { ... },
  "message": "Draft published successfully"
}
```

**Error (safety check failed):**
```json
{
  "error": "Cannot publish - safety check failed",
  "issues": ["Detected spam-like language"]
}
```

### POST /api/drafts/:id/ignore

Mark draft as ignored.

### DELETE /api/drafts/:id

Delete a draft.

## Styles

```typescript
type CastStyle = 'sharp' | 'founder' | 'technical' | 'funny' | 'concise' | 'thread';
```

| Style | Description |
|-------|-------------|
| sharp | Punchy, removed filler |
| founder | Confident, direct, opinionated |
| technical | Added precision markers |
| funny | Humorous twist |
| concise | Reduced to essentials |
| thread | Thread opener format |

## Draft Status

```typescript
type DraftStatus = 'draft' | 'approved' | 'published' | 'ignored';
```