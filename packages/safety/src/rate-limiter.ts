// safety/src/rate-limiter.ts — Token bucket rate limiter

import { SafetyBlockError } from './errors.js';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimiterConfig {
  maxTokens: number;
  refillPerSecond: number;
  windowMs?: number; // for fixed window variant
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  private getBucket(key: string): Bucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, { tokens: this.config.maxTokens, lastRefill: Date.now() });
    }
    return this.buckets.get(key)!;
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refilled = elapsed * this.config.refillPerSecond;
    bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + refilled);
    bucket.lastRefill = now;
  }

  /**
   * Try to consume one token. Returns silently if allowed, throws SafetyBlockError if rate limited.
   */
  consumeOrThrow(key: string, actionName: string): void {
    const bucket = this.getBucket(key);
    this.refill(bucket);
    if (bucket.tokens < 1) {
      throw new SafetyBlockError(
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded for ${key}: ${bucket.tokens.toFixed(2)} tokens available`,
        `Too many requests. Please slow down.`,
        1.0
      );
    }
    bucket.tokens -= 1;
  }

  /**
   * Try to consume N tokens. Returns silently if allowed, throws SafetyBlockError if not enough.
   */
  consumeNOrThrow(key: string, n: number, actionName: string): void {
    const bucket = this.getBucket(key);
    this.refill(bucket);
    if (bucket.tokens < n) {
      throw new SafetyBlockError(
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded for ${key}: need ${n} tokens, have ${bucket.tokens.toFixed(2)}`,
        `Too many requests. Please slow down.`,
        1.0
      );
    }
    bucket.tokens -= n;
  }

  /**
   * Check remaining tokens for a key without consuming.
   */
  remaining(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.config.maxTokens;
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }

  /**
   * Reset a specific key's bucket.
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clear all buckets.
   */
  clear(): void {
    this.buckets.clear();
  }

  getConfig(): RateLimiterConfig {
    return { ...this.config };
  }
}

// ─── Fixed Window Counter ─────────────────────────────────────────────────────

export interface FixedWindowConfig {
  maxRequests: number;
  windowMs: number;
}

export class FixedWindowRateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private config: FixedWindowConfig) {}

  private getWindow(key: string) {
    const now = Date.now();
    let win = this.windows.get(key);
    if (!win || now > win.resetAt) {
      win = { count: 0, resetAt: now + this.config.windowMs };
      this.windows.set(key, win);
    }
    return win;
  }

  checkOrThrow(key: string): void {
    const win = this.getWindow(key);
    if (win.count >= this.config.maxRequests) {
      throw new SafetyBlockError(
        'RATE_LIMIT_EXCEEDED',
        `Fixed window exceeded: ${win.count}/${this.config.maxRequests} in ${this.config.windowMs}ms`,
        `Rate limit exceeded. Try again later.`,
        1.0
      );
    }
    win.count++;
  }

  remaining(key: string): number {
    const win = this.windows.get(key);
    if (!win) return this.config.maxRequests;
    return Math.max(0, this.config.maxRequests - win.count);
  }

  reset(key: string): void {
    this.windows.delete(key);
  }
}

// ─── Daily Counter ─────────────────────────────────────────────────────────────

export class DailyCounter {
  private counts = new Map<string, { count: number; date: string }>();

  private keyForDate(key: string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `${key}:${today}`;
  }

  increment(key: string): number {
    const fullKey = this.keyForDate(key);
    let entry = this.counts.get(fullKey);
    const today = new Date().toISOString().slice(0, 10);
    if (!entry || entry.date !== today) {
      entry = { count: 0, date: today };
      this.counts.set(fullKey, entry);
    }
    entry.count++;
    return entry.count;
  }

  get(key: string): number {
    const fullKey = this.keyForDate(key);
    const entry = this.counts.get(fullKey);
    const today = new Date().toISOString().slice(0, 10);
    if (!entry || entry.date !== today) return 0;
    return entry.count;
  }

  reset(key: string): void {
    const fullKey = this.keyForDate(key);
    this.counts.delete(fullKey);
  }
}
