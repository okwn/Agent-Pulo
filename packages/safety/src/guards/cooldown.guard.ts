// safety/src/guards/cooldown.guard.ts — Cooldown-based spam prevention

import type { SafetyContext, SafetyResult } from '../types.js';
import { SafetyBlockError } from '../errors.js';

interface CooldownEntry {
  lastAction: number;
  count: number;
}

const authorCooldowns = new Map<string, CooldownEntry>();
const castCooldowns = new Map<string, CooldownEntry>();
const channelCooldowns = new Map<string, CooldownEntry>();

const AUTHOR_COOLDOWN_MS = 30_000; // 30 seconds between replies to same author
const CAST_COOLDOWN_MS = 60_000;  // 60 seconds between replies to same cast
const CHANNEL_COOLDOWN_MS = 10_000; // 10 seconds between channel messages

function cooldownKey(prefix: string, context: SafetyContext): string {
  return `${prefix}:${context.userId}:${context.authorFid ?? context.fid ?? 'anon'}:${context.castHash ?? 'nocast'}:${context.channelId ?? 'nochannel'}`;
}

function isInCooldown(
  key: string,
  map: Map<string, CooldownEntry>,
  windowMs: number
): boolean {
  const entry = map.get(key);
  if (!entry) return false;
  return Date.now() - entry.lastAction < windowMs;
}

function recordAction(
  key: string,
  map: Map<string, CooldownEntry>
): void {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry) {
    map.set(key, { lastAction: now, count: 1 });
  } else {
    entry.lastAction = now;
    entry.count++;
  }
}

export function enforceSameAuthorCooldown(context: SafetyContext): void {
  if (!context.authorFid) return;
  const key = `author:${context.userId}:${context.authorFid}`;
  if (isInCooldown(key, authorCooldowns, AUTHOR_COOLDOWN_MS)) {
    const entry = authorCooldowns.get(key)!;
    const remaining = Math.ceil((AUTHOR_COOLDOWN_MS - (Date.now() - entry.lastAction)) / 1000);
    throw new SafetyBlockError(
      'AUTHOR_COOLDOWN',
      `Same author cooldown active: ${remaining}s remaining`,
      `Please wait ${remaining}s before replying to this author again.`,
      1.0
    );
  }
  recordAction(key, authorCooldowns);
}

export function checkSameAuthorCooldown(context: SafetyContext): SafetyResult {
  if (!context.authorFid) return { safe: true, confidence: 1.0 };
  const key = `author:${context.userId}:${context.authorFid}`;
  const entry = authorCooldowns.get(key);
  if (!entry) return { safe: true, confidence: 1.0 };

  const elapsed = Date.now() - entry.lastAction;
  if (elapsed < AUTHOR_COOLDOWN_MS) {
    const remaining = Math.ceil((AUTHOR_COOLDOWN_MS - elapsed) / 1000);
    return {
      safe: false,
      reason: `Same author cooldown active: ${remaining}s remaining`,
      flag: 'AUTHOR_COOLDOWN',
      confidence: 1.0,
    };
  }
  return { safe: true, confidence: 1.0 };
}

export function enforceSameCastCooldown(context: SafetyContext): void {
  if (!context.castHash) return;
  const key = `cast:${context.userId}:${context.castHash}`;
  if (isInCooldown(key, castCooldowns, CAST_COOLDOWN_MS)) {
    const entry = castCooldowns.get(key)!;
    const remaining = Math.ceil((CAST_COOLDOWN_MS - (Date.now() - entry.lastAction)) / 1000);
    throw new SafetyBlockError(
      'CAST_COOLDOWN',
      `Same cast cooldown active: ${remaining}s remaining`,
      `You're doing that too fast. Please wait ${remaining}s.`,
      1.0
    );
  }
  recordAction(key, castCooldowns);
}

export function checkSameCastCooldown(context: SafetyContext): SafetyResult {
  if (!context.castHash) return { safe: true, confidence: 1.0 };
  const key = `cast:${context.userId}:${context.castHash}`;
  const entry = castCooldowns.get(key);
  if (!entry) return { safe: true, confidence: 1.0 };

  const elapsed = Date.now() - entry.lastAction;
  if (elapsed < CAST_COOLDOWN_MS) {
    const remaining = Math.ceil((CAST_COOLDOWN_MS - elapsed) / 1000);
    return {
      safe: false,
      reason: `Same cast cooldown active: ${remaining}s remaining`,
      flag: 'CAST_COOLDOWN',
      confidence: 1.0,
    };
  }
  return { safe: true, confidence: 1.0 };
}

export function enforceChannelCooldown(context: SafetyContext): void {
  if (!context.channelId) return;
  const key = `channel:${context.userId}:${context.channelId}`;
  if (isInCooldown(key, channelCooldowns, CHANNEL_COOLDOWN_MS)) {
    const entry = channelCooldowns.get(key)!;
    const remaining = Math.ceil((CHANNEL_COOLDOWN_MS - (Date.now() - entry.lastAction)) / 1000);
    throw new SafetyBlockError(
      'CHANNEL_COOLDOWN',
      `Channel cooldown active: ${remaining}s remaining`,
      `Slow down — you're sending to this channel too quickly.`,
      1.0
    );
  }
  recordAction(key, channelCooldowns);
}

export function checkChannelCooldown(context: SafetyContext): SafetyResult {
  if (!context.channelId) return { safe: true, confidence: 1.0 };
  const key = `channel:${context.userId}:${context.channelId}`;
  const entry = channelCooldowns.get(key);
  if (!entry) return { safe: true, confidence: 1.0 };

  const elapsed = Date.now() - entry.lastAction;
  if (elapsed < CHANNEL_COOLDOWN_MS) {
    const remaining = Math.ceil((CHANNEL_COOLDOWN_MS - elapsed) / 1000);
    return {
      safe: false,
      reason: `Channel cooldown active: ${remaining}s remaining`,
      flag: 'CHANNEL_COOLDOWN',
      confidence: 1.0,
    };
  }
  return { safe: true, confidence: 1.0 };
}

/** Clear all cooldowns (for testing). */
export function clearAllCooldowns(): void {
  authorCooldowns.clear();
  castCooldowns.clear();
  channelCooldowns.clear();
}
