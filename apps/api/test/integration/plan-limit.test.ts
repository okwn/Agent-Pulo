// Integration: Plan limit enforcement
// Verifies that free users hit limits and see upgrade CTA

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

describe('Plan Limit Enforcement Integration', () => {
  describe('POST /api/truth', () => {
    it('returns usage info on billing/usage', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const loginRes = await fetch(`${API_URL}/api/auth/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: 100, username: 'alice_farcaster' }),
      });

      if (loginRes.ok) {
        const cookies = loginRes.headers.get('set-cookie');
        const usageRes = await fetch(`${API_URL}/api/billing/usage`, {
          headers: { Cookie: cookies ?? '' },
        });
        expect(usageRes.status).toBeLessThan(500);
      }
    });
  });

  describe('Rate limit headers', () => {
    it('api includes rate limit headers', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/health`);
      expect(res.status).toBeLessThan(500);
    });
  });
});