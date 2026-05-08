import { describe, it, expect } from 'vitest';
import {
  getProvider,
  setMode,
  getMode,
  clearProvider,
  MockFarcasterProvider,
  makeIdempotencyKey,
  isValidIdempotencyKey,
  parseIdempotencyKey,
  withIdempotencyKey,
} from '../src/index.js';

describe('farcaster factory', () => {
  it('defaults to mock mode', () => {
    clearProvider();
    expect(getMode()).toBe('mock');
  });

  it('setMode changes the mode', () => {
    setMode('live');
    expect(getMode()).toBe('live');
    setMode('mock');
  });

  it('getProvider returns a provider in mock mode without throwing', () => {
    clearProvider();
    setMode('mock');
    const provider = getProvider();
    expect(provider).toBeDefined();
    expect(provider.mode).toBe('mock');
  });

  it('getProvider returns the same instance on repeated calls', () => {
    clearProvider();
    setMode('mock');
    const a = getProvider();
    const b = getProvider();
    expect(a).toBe(b);
  });
});

describe('idempotency', () => {
  it('makeIdempotencyKey generates a valid key', () => {
    const key = makeIdempotencyKey('publish', 1234, { text: 'hello' });
    expect(typeof key).toBe('string');
    expect(key.split(':').length).toBe(3);
  });

  it('isValidIdempotencyKey returns true for valid keys', () => {
    const key = makeIdempotencyKey('publish', 1234, { text: 'hello' });
    expect(isValidIdempotencyKey(key)).toBe(true);
  });

  it('isValidIdempotencyKey returns false for invalid keys', () => {
    expect(isValidIdempotencyKey('invalid')).toBe(false);
    expect(isValidIdempotencyKey('')).toBe(false);
  });

  it('parseIdempotencyKey parses a valid key', () => {
    const key = makeIdempotencyKey('publish', 1234, { text: 'hello' });
    const parsed = parseIdempotencyKey(key);
    expect(parsed).not.toBeNull();
    expect(parsed?.operation).toBe('publish');
    expect(parsed?.fid).toBe(1234);
  });

  it('withIdempotencyKey dedupes concurrent calls', async () => {
    clearProvider();
    let callCount = 0;
    const fn = () => Promise.resolve(++callCount);
    const key = 'dedup:test:1234';

    const [r1, r2] = await Promise.all([
      withIdempotencyKey(key, fn),
      withIdempotencyKey(key, fn),
    ]);

    expect(r1).toBe(r2);
    expect(callCount).toBe(1);
  });
});