// farcaster/providers/mock.ts — Mock provider for local dev and tests

import type {
  IFarcasterReadProvider,
  IFarcasterWriteProvider,
  IFarcasterNotificationProvider,
  IWebhookVerifier,
  FarMode,
  Cast,
  User,
  CastThread,
  SearchResult,
  PublishResult,
  PublishCastOptions,
  PublishReplyOptions,
  NotificationPayload,
  DirectCastPayload,
  WebhookVerificationResult,
  GetCastOptions,
  SearchCastsOptions,
  GetRepliesOptions,
} from './interfaces.js';

const MOCK_CASTS: Cast[] = [
  {
    hash: 'mock-cast-001',
    text: 'Just claimed my $DEGEN airdrop! 🔥',
    authorFid: 1,
    authorUsername: 'alice',
    authorDisplayName: 'Alice Chen',
    parentHash: null,
    rootParentHash: null,
    channelId: null,
    timestamp: new Date(Date.now() - 60_000).toISOString(),
    repliesCount: 3,
    recastsCount: 12,
    reactionsCount: 45,
  },
  {
    hash: 'mock-cast-002',
    text: 'Is it true that Ethereum is switching to proof-of-stake?',
    authorFid: 2,
    authorUsername: 'bob',
    authorDisplayName: 'Bob Martinez',
    parentHash: 'mock-cast-001',
    rootParentHash: 'mock-cast-001',
    channelId: null,
    timestamp: new Date(Date.now() - 30_000).toISOString(),
    repliesCount: 1,
    recastsCount: 0,
    reactionsCount: 5,
  },
];

const MOCK_USERS: User[] = [
  { fid: 1, username: 'alice', displayName: 'Alice Chen', custodyAddress: '0x1234', bio: 'Builder', avatarUrl: null },
  { fid: 2, username: 'bob', displayName: 'Bob Martinez', custodyAddress: '0x5678', bio: 'Trader', avatarUrl: null },
  { fid: 1234, username: 'pulo_bot', displayName: 'PULO Agent', custodyAddress: '0xdef0', bio: 'AI agent', avatarUrl: null },
];

// ─── Mock Read Provider ────────────────────────────────────────────────────────

class MockReadProvider implements IFarcasterReadProvider {
  async getCastByHash(hash: string): Promise<Cast> {
    const cast = MOCK_CASTS.find(c => c.hash === hash);
    if (!cast) throw new Error(`Mock cast not found: ${hash}`);
    return cast;
  }

  async getCastThread(hash: string, options?: GetCastOptions): Promise<CastThread> {
    const root = MOCK_CASTS.find(c => c.hash === hash) ?? MOCK_CASTS[0]!;
    const replies = MOCK_CASTS.filter(c => c.parentHash === hash);
    return {
      rootCast: root,
      replies,
      participants: [...new Set(replies.map(r => r.authorFid))],
      castHashes: [root.hash, ...replies.map(r => r.hash)],
    };
  }

  async getUserByFid(fid: number): Promise<User> {
    const user = MOCK_USERS.find(u => u.fid === fid);
    if (!user) throw new Error(`Mock user not found: ${fid}`);
    return user;
  }

  async getUserByUsername(username: string): Promise<User> {
    const user = MOCK_USERS.find(u => u.username === username);
    if (!user) throw new Error(`Mock user not found: @${username}`);
    return user;
  }

  async searchCasts(query: string, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    const limit = options?.limit ?? 20;
    const results = MOCK_CASTS.filter(c => c.text.toLowerCase().includes(query.toLowerCase()));
    return { results: results.slice(0, limit), nextCursor: undefined, total: results.length };
  }

  async getChannelCasts(channelId: string, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    const limit = options?.limit ?? 20;
    const results = MOCK_CASTS.filter(c => c.channelId === channelId);
    return { results: results.slice(0, limit), nextCursor: undefined, total: results.length };
  }

  async getReplies(castHash: string, options?: GetRepliesOptions): Promise<SearchResult<Cast>> {
    const limit = options?.limit ?? 20;
    const results = MOCK_CASTS.filter(c => c.parentHash === castHash);
    return { results: results.slice(0, limit), nextCursor: undefined, total: results.length };
  }

  async getUserRecentCasts(fid: number, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    const limit = options?.limit ?? 20;
    const results = MOCK_CASTS.filter(c => c.authorFid === fid);
    return { results: results.slice(0, limit), nextCursor: undefined, total: results.length };
  }
}

// ─── Mock Write Provider ───────────────────────────────────────────────────────

class MockWriteProviderImpl implements IFarcasterWriteProvider {
  private published: PublishResult[] = [];

  async publishCast(text: string, _options: PublishCastOptions): Promise<PublishResult> {
    const hash = `mock-publish-${Date.now()}`;
    const result: PublishResult = { hash, url: `https://warpcast.com/pulo_bot/${hash}` };
    this.published.push(result);
    return result;
  }

  async publishReply(_parentHash: string, text: string, _options: PublishReplyOptions): Promise<PublishResult> {
    const hash = `mock-reply-${Date.now()}`;
    return { hash, url: `https://warpcast.com/pulo_bot/${hash}` };
  }

  async deleteCast(_hash: string): Promise<void> {
    // no-op
  }

  getPublished(): PublishResult[] {
    return [...this.published];
  }
}

// ─── Mock Notification Provider ─────────────────────────────────────────────

class MockNotificationProviderImpl implements IFarcasterNotificationProvider {
  private sentNotifications: Array<{ fid: number; payload: NotificationPayload; key: string }> = [];
  private sentDirectCasts: Array<{ fid: number; payload: DirectCastPayload; key: string }> = [];

  async sendMiniAppNotification(fid: number, payload: NotificationPayload, idempotencyKey: string): Promise<void> {
    this.sentNotifications.push({ fid, payload, key: idempotencyKey });
  }

  async sendDirectCast(fid: number, payload: DirectCastPayload, idempotencyKey: string): Promise<void> {
    this.sentDirectCasts.push({ fid, payload, key: idempotencyKey });
  }

  getNotifications(): Array<{ fid: number; payload: NotificationPayload; key: string }> {
    return [...this.sentNotifications];
  }

  getDirectCasts(): Array<{ fid: number; payload: DirectCastPayload; key: string }> {
    return [...this.sentDirectCasts];
  }

  clear(): void {
    this.sentNotifications = [];
    this.sentDirectCasts = [];
  }
}

// ─── Mock Webhook Verifier ────────────────────────────────────────────────────

class MockWebhookVerifierImpl implements IWebhookVerifier {
  async verifyMentionWebhook(request: { body: string | Buffer; signature: string }): Promise<WebhookVerificationResult> {
    const body = typeof request.body === 'string' ? request.body : request.body.toString();
    if (!body) return { verified: false, error: 'Empty body' };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(body) as any;
      const fid = data?.data?.cast?.author?.fid ?? data?.fid ?? 1234;
      return { verified: true, fid, type: data?.type ?? 'mention' };
    } catch {
      return { verified: true, fid: 1234, type: 'mention' };
    }
  }
}

// ─── Mock Composite Provider ──────────────────────────────────────────────────
// IFarcasterProvider extends IFarcasterReadProvider, so all read methods must be
// directly on the provider (not delegated to a sub-object).

export class MockFarcasterProvider implements IFarcasterReadProvider {
  readonly mode: FarMode = 'mock';
  readonly providerName = 'mock';

  readonly read: IFarcasterReadProvider;
  readonly write: IFarcasterWriteProvider;
  readonly notifications: IFarcasterNotificationProvider;
  readonly webhook: IWebhookVerifier;

  constructor() {
    this.read = new MockReadProvider();
    this.write = new MockWriteProviderImpl();
    this.notifications = new MockNotificationProviderImpl();
    this.webhook = new MockWebhookVerifierImpl();
  }

  // ── Forward all IFarcasterReadProvider methods directly ──────────────────────

  async getCastByHash(hash: string): Promise<Cast> {
    return this.read.getCastByHash(hash);
  }

  async getCastThread(hash: string, options?: GetCastOptions): Promise<CastThread> {
    return this.read.getCastThread(hash, options);
  }

  async getUserByFid(fid: number): Promise<User> {
    return this.read.getUserByFid(fid);
  }

  async getUserByUsername(username: string): Promise<User> {
    return this.read.getUserByUsername(username);
  }

  async searchCasts(query: string, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    return this.read.searchCasts(query, options);
  }

  async getChannelCasts(channelId: string, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    return this.read.getChannelCasts(channelId, options);
  }

  async getReplies(castHash: string, options?: GetRepliesOptions): Promise<SearchResult<Cast>> {
    return this.read.getReplies(castHash, options);
  }

  async getUserRecentCasts(fid: number, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    return this.read.getUserRecentCasts(fid, options);
  }

  // ── Convenience helpers (not required by interface) ─────────────────────────

  getWrite(): IFarcasterWriteProvider {
    return this.write;
  }

  getNotifications(): IFarcasterNotificationProvider {
    return this.notifications;
  }
}