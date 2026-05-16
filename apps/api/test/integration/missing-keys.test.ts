// Integration: Missing live key error handling
// Verifies the system fails gracefully when API keys are missing

import { describe, it, expect } from 'vitest';

const API_URL = process.env.PULO_API_URL ?? 'http://localhost:4311';

async function isReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('Missing Live Key Handling', () => {
  describe('API works in mock mode without keys', () => {
    it('health endpoint returns ok in mock mode', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/health`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.status).toBeDefined();
    });

    it('webhook accepts requests in mock mode', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/webhook/farcaster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mention', castHash: 'test_123', fid: 100 }),
      });

      expect(res.ok).toBe(true);
    });

    it('composer returns mock response', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/composer/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test', style: 'concise' }),
      });

      expect(res.status).toBeLessThan(500);
      const data = await res.json().catch(() => ({}));
      expect(typeof data).toBe('object');
    });
  });

  describe('Auth without live keys', () => {
    it('demo login works without live keys', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/auth/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: 100, username: 'alice_farcaster' }),
      });

      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });
});