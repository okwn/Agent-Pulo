// farcaster/providers/neynar.ts — Neynar provider implementation

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
import {
  MissingCredentialsError,
  RateLimitError,
  PublishError,
  SignerError,
  isRetryable,
} from '../errors.js';

// ─── Validation helpers ─────────────────────────────────────────────────────────

function requireKey(key: string, name: string): string {
  if (!key || key.startsWith('PLACEHOLDER') || key === 'undefined') {
    throw new MissingCredentialsError('Neynar', name);
  }
  return key;
}

function requireSignerKey(key: string | undefined): string {
  if (!key || key === 'undefined') {
    throw new MissingCredentialsError('Neynar', 'FARCASTER_BOT_SIGNER_UUID');
  }
  return key;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNeynarCast(raw: any): Cast {
  return {
    hash: raw.hash,
    text: raw.text,
    authorFid: raw.author?.fid ?? raw.authorFid,
    authorUsername: raw.author?.username ?? raw.authorUsername,
    authorDisplayName: raw.author?.display_name ?? raw.authorDisplayName,
    parentHash: raw.parent_hash ?? raw.parentHash ?? null,
    rootParentHash: raw.root_parent_hash ?? raw.rootParentHash ?? null,
    channelId: raw.channel?.id ?? raw.channelId ?? null,
    timestamp: raw.timestamp ?? raw.createdAt,
    repliesCount: raw.replies_count ?? raw.repliesCount,
    recastsCount: raw.recasts_count ?? raw.recastsCount,
    reactionsCount: raw.reactions_count ?? raw.reactionsCount,
    rawJson: raw,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNeynarUser(raw: any): User {
  return {
    fid: raw.fid,
    username: raw.username,
    displayName: raw.display_name ?? raw.displayName ?? null,
    custodyAddress: raw.custody_address ?? raw.custodyAddress ?? null,
    bio: raw.bio ?? null,
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? null,
    verifiedAddresses: raw.verified_addresses ?? raw.verifiedAddresses ?? [],
    followerCount: raw.follower_count ?? raw.followerCount,
    followingCount: raw.following_count ?? raw.followingCount,
    isVerified: raw.is_verified ?? raw.isVerified ?? false,
    rawJson: raw,
  };
}

// ─── Retry-safe wrapper ────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || i === retries) break;
    }
  }
  throw lastError;
}

// ─── Neynar Read Provider ─────────────────────────────────────────────────────

class NeynarReadProviderImpl implements IFarcasterReadProvider {
  private apiKey: string;
  private baseUrl = 'https://api.neynar.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: { api_key: this.apiKey, 'Content-Type': 'application/json' },
    });
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      throw new RateLimitError('Neynar', retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined);
    }
    if (res.status === 404) throw new Error(`Not found: ${path}`);
    if (!res.ok) throw new Error(`Neynar API error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async getCastByHash(hash: string): Promise<Cast> {
    const data = await this.fetch<{ cast: unknown }>(`/casts/info?hash=${hash}&type=hash`);
    return mapNeynarCast(data.cast);
  }

  async getCastThread(hash: string, options?: GetCastOptions): Promise<CastThread> {
    const depth = options?.depth ?? 1;
    const root = await this.getCastByHash(hash);
    const replies: Cast[] = [];
    if (depth >= 1) {
      try {
        const data = await this.fetch<{ casts: unknown[] }>(
          `/casts/by_id/${hash}/replies?limit=50`
        );
        replies.push(...(data.casts ?? []).map(mapNeynarCast));
      } catch { /* no replies */ }
    }
    return {
      rootCast: root,
      replies,
      participants: [...new Set(replies.map(r => r.authorFid))],
      castHashes: [root.hash, ...replies.map(r => r.hash)],
    };
  }

  async getUserByFid(fid: number): Promise<User> {
    const data = await this.fetch<{ user: unknown }>(`/user?fid=${fid}`);
    return mapNeynarUser((data as { user: unknown }).user);
  }

  async getUserByUsername(username: string): Promise<User> {
    const data = await this.fetch<{ user: unknown }>(`/user/by_username?username=${username}`);
    return mapNeynarUser((data as { user: unknown }).user);
  }

  async searchCasts(query: string, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    const data = await this.fetch<{ casts: unknown[]; next?: { cursor: string } }>(
      '/casts/search',
      { query, cursor: options?.cursor, limit: String(options?.limit ?? 20) }
    );
    return {
      results: (data.casts ?? []).map(mapNeynarCast),
      nextCursor: data.next?.cursor,
    };
  }

  async getChannelCasts(channelId: string, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    const data = await this.fetch<{ casts: unknown[]; next?: { cursor: string } }>(
      `/channel/${channelId}/casts`,
      { cursor: options?.cursor, limit: String(options?.limit ?? 20) }
    );
    return {
      results: (data.casts ?? []).map(mapNeynarCast),
      nextCursor: data.next?.cursor,
    };
  }

  async getReplies(castHash: string, options?: GetRepliesOptions): Promise<SearchResult<Cast>> {
    const data = await this.fetch<{ casts: unknown[]; next?: { cursor: string } }>(
      `/casts/by_id/${castHash}/replies`,
      { cursor: options?.cursor, limit: String(options?.limit ?? 20) }
    );
    return {
      results: (data.casts ?? []).map(mapNeynarCast),
      nextCursor: data.next?.cursor,
    };
  }

  async getUserRecentCasts(fid: number, options?: SearchCastsOptions): Promise<SearchResult<Cast>> {
    const data = await this.fetch<{ casts: unknown[]; next?: { cursor: string } }>(
      `/casts/by_user/${fid}`,
      { cursor: options?.cursor, limit: String(options?.limit ?? 20) }
    );
    return {
      results: (data.casts ?? []).map(mapNeynarCast),
      nextCursor: data.next?.cursor,
    };
  }
}

// ─── Neynar Write Provider ─────────────────────────────────────────────────────

class NeynarWriteProviderImpl implements IFarcasterWriteProvider {
  private apiKey: string;
  private baseUrl = 'https://api.neynar.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { api_key: this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 403) throw new SignerError('Signer rejected the operation');
    if (res.status === 429) throw new RateLimitError('Neynar');
    if (!res.ok) throw new PublishError('', await res.text());
    return res.json() as Promise<T>;
  }

  async publishCast(text: string, options: PublishCastOptions): Promise<PublishResult> {
    const data = await this.post<{ hash: string; uri?: string }>('/casts', {
      signer_uuid: requireSignerKey(options.signerUuid),
      text,
      ...(options.channelId ? { channel_id: options.channelId } : {}),
    });
    return { hash: data.hash, url: data.uri ?? `https://warpcast.com/pulo_bot/${data.hash}` };
  }

  async publishReply(parentHash: string, text: string, options: PublishReplyOptions): Promise<PublishResult> {
    const data = await this.post<{ hash: string; uri?: string }>('/casts', {
      signer_uuid: requireSignerKey(options.signerUuid),
      text,
      parent: parentHash,
    });
    return { hash: data.hash, url: data.uri ?? `https://warpcast.com/pulo_bot/${data.hash}` };
  }

  async deleteCast(hash: string, signerUuid: string): Promise<void> {
    await this.post('/casts/delete', { hash, signer_uuid: signerUuid });
  }
}

// ─── Neynar Notification Provider ────────────────────────────────────────────

class NeynarNotificationProviderImpl implements IFarcasterNotificationProvider {
  private apiKey: string;
  private baseUrl = 'https://api.neynar.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMiniAppNotification(
    fid: number,
    payload: NotificationPayload,
    idempotencyKey: string
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/notifications`, {
      method: 'POST',
      headers: { api_key: this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid,
        title: payload.title,
        body: payload.body,
        ...(payload.targetUrl ? { target_url: payload.targetUrl } : {}),
        idempotency_key: idempotencyKey,
      }),
    });
    if (!res.ok && res.status !== 429) {
      throw new Error(`Failed to send notification: ${res.status}`);
    }
  }

  async sendDirectCast(fid: number, payload: DirectCastPayload, idempotencyKey: string): Promise<void> {
    const signerUuid = requireSignerKey(process.env.FARCASTER_BOT_SIGNER_UUID);
    const res = await fetch(`${this.baseUrl}/casts`, {
      method: 'POST',
      headers: { api_key: this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text: `@${fid} ${payload.message}`,
        idempotency_key: idempotencyKey,
      }),
    });
    if (!res.ok && res.status !== 429) {
      throw new Error(`Failed to send direct cast: ${res.status}`);
    }
  }
}

// ─── Neynar Webhook Verifier ───────────────────────────────────────────────────

export class NeynarWebhookVerifier implements IWebhookVerifier {
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  async verifyMentionWebhook(request: { body: string | Buffer; signature: string }): Promise<WebhookVerificationResult> {
    try {
      const { createHmac } = await import('node:crypto');
      const body = typeof request.body === 'string' ? request.body : request.body.toString();
      const expected = createHmac('sha256', this.webhookSecret).update(body).digest('hex');
      if (request.signature !== expected) {
        return { verified: false, error: 'Signature mismatch' };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(body) as any;
      return {
        verified: true,
        fid: data?.data?.cast?.author?.fid ?? data?.fid,
        type: data?.type ?? 'mention',
      };
    } catch (err) {
      return { verified: false, error: String(err) };
    }
  }
}

// ─── Neynar Provider Factory ─────────────────────────────────────────────────

export interface NeynarProviderConfig {
  apiKey: string;
  clientId?: string;
  webhookSecret?: string;
  signerUuid?: string;
}

// NeynarFarcasterProvider implements IFarcasterProvider directly so that it has
// all read methods on the provider instance (IFarcasterProvider extends
// IFarcasterReadProvider).

export class NeynarFarcasterProvider implements IFarcasterReadProvider {
  readonly mode: FarMode = 'live';
  readonly providerName = 'neynar';

  readonly read: IFarcasterReadProvider;
  readonly write: IFarcasterWriteProvider;
  readonly notifications: IFarcasterNotificationProvider;
  readonly webhook: IWebhookVerifier;

  constructor(config: NeynarProviderConfig) {
    const apiKey = requireKey(config.apiKey, 'NEYNAR_API_KEY');
    this.read = new NeynarReadProviderImpl(apiKey);
    this.write = new NeynarWriteProviderImpl(apiKey);
    this.notifications = new NeynarNotificationProviderImpl(apiKey);
    this.webhook = config.webhookSecret
      ? new NeynarWebhookVerifier(config.webhookSecret)
      : new NeynarWebhookVerifier('dummy-secret-for-testing');
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
}