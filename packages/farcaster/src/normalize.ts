// farcaster/normalize.ts — Normalize raw webhook/payload data into internal types

export interface NormalizedMention {
  type: 'mention';
  fid: number;
  username: string;
  displayName?: string;
  castHash: string;
  castText: string;
  parentHash: string | null;
  rootParentHash: string | null;
  channelId: string | null;
  timestamp: string;
  mentionedFids: number[];
  rawJson: Record<string, unknown>;
}

export interface NormalizedReply {
  type: 'reply';
  fid: number;
  username: string;
  displayName?: string;
  castHash: string;
  castText: string;
  parentHash: string;
  rootParentHash: string | null;
  channelId: string | null;
  timestamp: string;
  rawJson: Record<string, unknown>;
}

export interface NormalizedDM {
  type: 'dm';
  fid: number;
  username: string;
  message: string;
  timestamp: string;
  rawJson: Record<string, unknown>;
}

export type NormalizedEvent = NormalizedMention | NormalizedReply | NormalizedDM;

// ─── Neynar Mention Normalization ────────────────────────────────────────────

interface NeynarCast {
  hash: string;
  text: string;
  author: {
    fid: number;
    username: string;
    display_name?: string;
  };
  parent_hash?: string | null;
  root_parent_hash?: string | null;
  channel?: { id: string } | null;
  timestamp: string;
}

interface NeynarWebhookPayload {
  type: string;
  data: {
    cast?: NeynarCast;
    signer?: string;
    fid?: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeNeynarWebhook(raw: unknown, fid?: number): NormalizedEvent[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = raw as any;

  if (!payload || !payload.type) return [];

  const events: NormalizedEvent[] = [];

  if (payload.type === 'mention' && payload.data?.cast) {
    const cast = payload.data.cast as NeynarCast;
    events.push(normalizeCastAsMention(cast));
  }

  if (payload.type === 'cast_created' && payload.data?.cast) {
    const cast = payload.data.cast as NeynarCast;
    if (cast.parent_hash) {
      events.push(normalizeCastAsReply(cast));
    }
  }

  if (payload.type === 'direct_message' && payload.data) {
    events.push(normalizeDM(payload.data));
  }

  return events;
}

function normalizeCastAsMention(cast: NeynarCast): NormalizedMention {
  return {
    type: 'mention',
    fid: cast.author.fid,
    username: cast.author.username,
    displayName: cast.author.display_name,
    castHash: cast.hash,
    castText: cast.text,
    parentHash: cast.parent_hash ?? null,
    rootParentHash: cast.root_parent_hash ?? null,
    channelId: cast.channel?.id ?? null,
    timestamp: cast.timestamp,
    mentionedFids: extractMentionedFids(cast.text),
    rawJson: cast as unknown as Record<string, unknown>,
  };
}

function normalizeCastAsReply(cast: NeynarCast): NormalizedReply {
  return {
    type: 'reply',
    fid: cast.author.fid,
    username: cast.author.username,
    displayName: cast.author.display_name,
    castHash: cast.hash,
    castText: cast.text,
    parentHash: cast.parent_hash ?? '',
    rootParentHash: cast.root_parent_hash ?? null,
    channelId: cast.channel?.id ?? null,
    timestamp: cast.timestamp,
    rawJson: cast as unknown as Record<string, unknown>,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDM(data: any): NormalizedDM {
  return {
    type: 'dm',
    fid: data.fid ?? 0,
    username: data.username ?? 'unknown',
    message: data.message ?? '',
    timestamp: data.timestamp ?? new Date().toISOString(),
    rawJson: data as Record<string, unknown>,
  };
}

export function extractMentionedFids(text: string): number[] {
  const matches = text.matchAll(/@(\d+)/g);
  return [...matches].map(m => parseInt(m[1] ?? '0', 10)).filter(n => !isNaN(n));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeCast(raw: any): NormalizedMention {
  return {
    type: 'mention',
    fid: raw.author?.fid ?? raw.authorFid ?? 0,
    username: raw.author?.username ?? raw.authorUsername ?? '',
    displayName: raw.author?.display_name ?? raw.authorDisplayName,
    castHash: raw.hash ?? '',
    castText: raw.text ?? '',
    parentHash: raw.parent_hash ?? raw.parentHash ?? null,
    rootParentHash: raw.root_parent_hash ?? raw.rootParentHash ?? null,
    channelId: raw.channel?.id ?? raw.channelId ?? null,
    timestamp: raw.timestamp ?? '',
    mentionedFids: extractMentionedFids(raw.text ?? ''),
    rawJson: raw,
  };
}