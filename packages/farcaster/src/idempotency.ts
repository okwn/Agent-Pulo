// farcaster/idempotency.ts — Idempotency key generation and checking

import { createHash } from 'node:crypto';

export interface IdempotencyKey {
  key: string;
  createdAt: number;
  payloadHash: string;
}

// Generate a deterministic idempotency key from operation params
export function makeIdempotencyKey(
  operation: string,
  fid: number,
  payload: Record<string, unknown>
): string {
  const hash = createHash('sha256')
    .update(JSON.stringify({ operation, fid, ...payload }))
    .digest('hex')
    .slice(0, 32);
  return `${operation}:${fid}:${hash}`;
}

// Check if a key matches expected pattern (format: operation:fid:hash)
export function isValidIdempotencyKey(key: string): boolean {
  const parts = key.split(':');
  return parts.length === 3 && parts[2]!.length === 32;
}

// Parse idempotency key into components
export function parseIdempotencyKey(key: string): {
  operation: string;
  fid: number;
  payloadHash: string;
} | null {
  const parts = key.split(':');
  if (parts.length !== 3) return null;
  const hashPart = parts[2];
  if (!hashPart || hashPart.length !== 32) return null;
  const fidPart = parts[1];
  if (!fidPart) return null;
  return { operation: parts[0]!, fid: parseInt(fidPart, 10), payloadHash: hashPart };
}

// Short-lived cache key for deduping in-flight requests (in memory, not Redis)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightKeys = new Map<string, any>();

export async function withIdempotencyKey<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inFlightKeys.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = fn();
  promise.finally(() => { inFlightKeys.delete(key); });
  inFlightKeys.set(key, promise);
  return promise;
}

// TTL-based cleanup of in-flight map (call periodically)
export function cleanupInFlightKeys(): void {
  if (inFlightKeys.size > 1000) {
    inFlightKeys.clear();
  }
}