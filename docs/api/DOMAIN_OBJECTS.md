# DOMAIN_OBJECTS.md

## API Domain Types

These types represent the domain objects used across the PULO API and worker services. They are derived from the database schema but shaped for API consumption.

---

## User

```typescript
interface User {
  id: number;
  fid: number;
  username: string;
  displayName: string | null;
  custodyAddress: string | null;
  verifiedAddresses: string[];
  plan: 'free' | 'pro' | 'team';
  status: 'active' | 'suspended' | 'deactivated';
  createdAt: string; // ISO 8601
  updatedAt: string;
}

interface UserWithPreferences extends User {
  preferences: UserPreferences;
}
```

## UserPreferences

```typescript
interface UserPreferences {
  userId: number;
  language: string;         // ISO 639-1, e.g. 'en'
  tone: 'balanced' | 'formal' | 'casual' | 'witty';
  replyStyle: 'helpful' | 'brief' | 'detailed' | 'persuasive';
  riskTolerance: 'low' | 'medium' | 'high';
  notificationFrequency: 'realtime' | 'digest' | 'minimal';
  allowMiniAppNotifications: boolean;
  allowDirectCasts: boolean;
  allowedTopics: string[];
  blockedTopics: string[];
  preferredChannels: string[];
  autoReplyMode: 'off' | 'draft' | 'publish';
  dailyAlertLimit: number;
  dailyReplyLimit: number;
  updatedAt: string;
}
```

## Subscription

```typescript
interface Subscription {
  id: number;
  userId: number;
  provider: 'manual' | 'stripe' | 'paddle' | 'lemon_squeezy';
  externalSubscriptionId: string | null;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'expired';
  expiresAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

## Cast

```typescript
interface Cast {
  id: number;
  castHash: string;
  authorFid: number;
  authorUsername: string;
  text: string;
  channelId: string | null;
  parentHash: string | null;
  rootParentHash: string | null;
  rawJson: Record<string, unknown>;
  createdAt: string;
  indexedAt: string;
}

interface CastThread {
  id: number;
  rootHash: string;
  summary: string | null;
  castHashes: string[];
  participants: number[];
  createdAt: string;
  updatedAt: string;
}
```

## AgentEvent

```typescript
type EventSource = 'webhook' | 'worker' | 'api' | 'scheduler';
type EventType = 'mention' | 'reply' | 'dm' | 'trend_detected' | 'truth_check_request' | 'alert_triggered' | 'auto_reply';
type EventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'deduplicated';

interface AgentEvent {
  id: string; // UUID
  source: EventSource;
  type: EventType;
  userId: number | null;
  fid: number | null;
  castHash: string | null;
  payload: Record<string, unknown>;
  status: EventStatus;
  dedupeKey: string | null;
  createdAt: string;
  processedAt: string | null;
}
```

## AgentRun

```typescript
type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

interface AgentRun {
  id: string; // UUID
  eventId: string | null;
  userId: number | null;
  runType: string;           // 'reply' | 'truth_check' | 'trend_analysis' | 'summarize'
  model: string;            // 'gpt-4o-mini' | 'claude-haiku-4'
  inputTokens: number | null;
  outputTokens: number | null;
  costEstimate: string | null;
  status: RunStatus;
  decision: string | null;
  output: Record<string, unknown>;
  errorCode: string | null;
  createdAt: string;
}
```

## ReplyDraft

```typescript
type DraftStatus = 'pending' | 'approved' | 'published' | 'rejected';

interface ReplyDraft {
  id: string; // UUID
  userId: number;
  castHash: string;
  text: string;
  score: number | null;     // 0-100
  status: DraftStatus;
  publishedCastHash: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## TruthCheck

```typescript
type Verdict = 'verified' | 'likely_true' | 'uncertain' | 'likely_false' | 'debunked';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface TruthCheck {
  id: string; // UUID
  userId: number | null;
  targetCastHash: string | null;
  claimText: string;
  verdict: Verdict | null;
  confidence: number | null;  // 0-100
  evidenceSummary: string | null;
  counterEvidenceSummary: string | null;
  sourceCastHashes: string[];
  riskLevel: RiskLevel | null;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}
```

## Trend

```typescript
type TrendCategory = 'airdrop' | 'grant' | 'reward' | 'token' | 'program' | 'governance' | 'social';
type TrendStatus = 'active' | 'fading' | 'confirmed' | 'debunked';

interface Trend {
  id: string; // UUID
  title: string;
  category: TrendCategory;
  keywords: string[];
  score: number;
  velocity: number;           // mentions per hour
  riskLevel: RiskLevel;
  confidence: number;          // 0-100
  status: TrendStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceCount: number;
  castCount: number;
  trustedAuthorCount: number;
  summary: string | null;
  metadata: Record<string, unknown>;
}

interface TrendSource {
  id: string; // UUID
  trendId: string;
  castHash: string;
  authorFid: number;
  channelId: string | null;
  text: string;
  engagementScore: number;
  trustScore: number;          // 0-100
  createdAt: string;
}
```

## AlertDelivery

```typescript
type DeliveryChannel = 'dm' | 'cast_reply' | 'miniapp' | 'email' | 'webhook';
type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';

interface AlertDelivery {
  id: string; // UUID
  userId: number;
  trendId: string | null;
  truthCheckId: string | null;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  idempotencyKey: string;
  sentAt: string | null;
  openedAt: string | null;
  errorCode: string | null;
}
```

## AdminAuditLog

```typescript
interface AdminAuditLog {
  id: string; // UUID
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}
```

## RateLimitEvent

```typescript
interface RateLimitEvent {
  id: string; // UUID
  userId: number | null;
  fid: number | null;
  key: string;
  window: string;
  count: number;
  decision: 'allowed' | 'denied' | 'throttled';
  createdAt: string;
}
```

## SafetyFlag

```typescript
type Severity = 'low' | 'medium' | 'high' | 'critical';

interface SafetyFlag {
  id: string; // UUID
  userId: number | null;
  castHash: string | null;
  entityType: 'user' | 'cast' | 'channel';
  entityId: string;
  reason: string;
  severity: Severity;
  status: 'active' | 'reviewed' | 'cleared' | 'escalated';
  createdAt: string;
}
```

---

## API Response Envelope

All API responses follow this envelope:

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

interface ApiError {
  error: {
    code: string;      // e.g. 'E203' from ERROR_TAXONOMY.md
    message: string;
    context?: Record<string, unknown>;
  };
}
```