# Mention Webhook API

## Endpoints

### POST /api/webhooks/mentions (Neynar incoming)

Receive mention webhook from Neynar.

**Headers:**
- `x-signature` — Neynar signature
- `x-timestamp` — Unix timestamp

**Body:** Neynar mention event JSON

**Behavior:**
- Verifies signature via `verifyAndNormalizeMention()`
- Enqueues to BullMQ `pulo-mentions` queue
- Returns `202 Accepted` immediately

**Response:**
```json
{ "queued": true, "jobId": "uuid" }
```

### GET /api/admin/agent-events

List agent events.

**Query params:**
- `limit` (default 50, max 100)
- `offset` (default 0)
- `status` — filter by status (pending/completed/failed)
- `source` — filter by source (webhook/api/scheduler)

**Response:**
```json
{
  "data": [AgentEvent],
  "total": number
}
```

### GET /api/admin/agent-runs

List agent pipeline runs.

**Query params:**
- `limit`, `offset`
- `runType` — filter by run type

**Response:** Same structure as agent-events.

### GET /api/admin/reply-drafts

List pending reply drafts.

**Response:**
```json
{
  "data": [ReplyDraft],
  "total": number
}
```

### POST /api/admin/reply-drafts/:id/publish

Publish a pending draft.

**Response:**
```json
{ "success": true, "draftId": "uuid" }
```

### POST /api/admin/agent-events/:id/retry

Retry a failed agent event.

**Response:**
```json
{ "success": true, "eventId": "uuid" }
```

## Types

```ts
interface AgentEvent {
  id: string;
  type: 'mention' | 'reply' | 'dm' | 'truth_check_request';
  source: 'webhook' | 'api' | 'scheduler';
  userId: number | null;
  fid: number | null;
  castHash: string | null;
  status: 'pending' | 'completed' | 'failed';
  payload: Record<string, unknown>;
  createdAt: Date;
  processedAt: Date | null;
}

interface ReplyDraft {
  id: string;
  userId: number;
  alertId: string;
  channel: DeliveryChannel;
  status: 'pending' | 'sent' | 'failed';
  sentAt: Date | null;
  errorCode: string | null;
}
```
