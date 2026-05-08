// farcaster/providers/interfaces.ts — Provider interface definitions

export interface GetCastOptions {
  depth?: number; // 0 = cast only, 1 = with replies, 2 = with thread
}

export interface SearchCastsOptions {
  cursor?: string;
  limit?: number; // default 20, max 100
}

export interface GetRepliesOptions {
  cursor?: string;
  limit?: number;
}

export interface PublishCastOptions {
  signerUuid: string;
  channelId?: string;
  idempotencyKey?: string;
}

export interface PublishReplyOptions {
  signerUuid: string;
  idempotencyKey?: string;
}

// ─── Read Interface ───────────────────────────────────────────────────────────

export interface Cast {
  hash: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  authorDisplayName?: string;
  parentHash: string | null;
  rootParentHash: string | null;
  channelId: string | null;
  timestamp: string;
  repliesCount?: number;
  recastsCount?: number;
  reactionsCount?: number;
  rawJson?: Record<string, unknown>;
}

export interface User {
  fid: number;
  username: string;
  displayName: string | null;
  custodyAddress: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  verifiedAddresses?: string[];
  followerCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  rawJson?: Record<string, unknown>;
}

export interface CastThread {
  rootCast: Cast;
  replies: Cast[];
  participants: number[];
  castHashes: string[];
  cursor?: string;
}

export interface SearchResult<T> {
  results: T[];
  nextCursor?: string;
  total?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Channel {}

export interface IFarcasterReadProvider {
  getCastByHash(hash: string): Promise<Cast>;
  getCastThread(hash: string, options?: GetCastOptions): Promise<CastThread>;
  getUserByFid(fid: number): Promise<User>;
  getUserByUsername(username: string): Promise<User>;
  searchCasts(query: string, options?: SearchCastsOptions): Promise<SearchResult<Cast>>;
  getChannelCasts(channelId: string, options?: SearchCastsOptions): Promise<SearchResult<Cast>>;
  getReplies(castHash: string, options?: GetRepliesOptions): Promise<SearchResult<Cast>>;
  getUserRecentCasts(fid: number, options?: SearchCastsOptions): Promise<SearchResult<Cast>>;
}

// ─── Write Interface ──────────────────────────────────────────────────────────

export interface PublishResult {
  hash: string;
  url?: string;
}

export interface IFarcasterWriteProvider {
  publishCast(text: string, options: PublishCastOptions): Promise<PublishResult>;
  publishReply(parentHash: string, text: string, options: PublishReplyOptions): Promise<PublishResult>;
  deleteCast?(hash: string, signerUuid: string): Promise<void>;
}

// ─── Notification Interface ──────────────────────────────────────────────────

export interface NotificationPayload {
  title: string;
  body: string;
  targetUrl?: string;
}

export interface DirectCastPayload {
  message: string;
}

export interface IFarcasterNotificationProvider {
  sendMiniAppNotification(
    fid: number,
    payload: NotificationPayload,
    idempotencyKey: string
  ): Promise<void>;

  sendDirectCast(
    fid: number,
    payload: DirectCastPayload,
    idempotencyKey: string
  ): Promise<void>;
}

// ─── Webhook Verifier ─────────────────────────────────────────────────────────

export interface WebhookVerificationResult {
  verified: boolean;
  fid?: number;
  type?: string;
  error?: string;
}

export interface IWebhookVerifier {
  verifyMentionWebhook(request: {
    body: string | Buffer;
    signature: string;
    timestamp?: string;
  }): Promise<WebhookVerificationResult>;

  verifyCastWebhook?(request: {
    body: string | Buffer;
    signature: string;
  }): Promise<WebhookVerificationResult>;
}

// ─── Composite Provider ───────────────────────────────────────────────────────

export type FarMode = 'mock' | 'live';

export interface IFarcasterProvider extends IFarcasterReadProvider {
  write: IFarcasterWriteProvider;
  notifications: IFarcasterNotificationProvider;
  webhook: IWebhookVerifier;
  mode: FarMode;
  providerName: string;
}