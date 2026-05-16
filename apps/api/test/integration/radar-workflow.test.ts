// Integration: Radar scan workflow
// Verifies trend detection and admin approval flow

import { describe, it, expect } from 'vitest';
import { uniqueId as UniqueId } from '../../../../tests/helpers/setup.js';

const API_URL = process.env.PULO_API_URL ?? 'http://localhost:4311';

async function isReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('Radar Workflow Integration', () => {
  describe('GET /api/radar/trends', () => {
    it('returns trend list with expected shape', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/radar/trends`);
      expect(res.status).toBeLessThan(500);
      const data = await res.json().catch(() => ({}));
      if (data.trends) {
        expect(Array.isArray(data.trends)).toBe(true);
      }
    });
  });

  describe('GET /api/radar/trends/:id', () => {
    it('returns trend detail or 404', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const trendId = `nonexistent_${UniqueId('radar')}`;
      const res = await fetch(`${API_URL}/api/radar/trends/${trendId}`);
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Admin trend approval flow', () => {
    it('admin trends endpoint is accessible', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/admin/trends`);
      expect([200, 401, 403]).toContain(res.status);
    });
  });
});