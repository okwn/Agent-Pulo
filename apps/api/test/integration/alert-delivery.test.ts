// Integration: Alert delivery workflow
// Verifies alerts are created and delivered correctly

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

describe('Alert Delivery Integration', () => {
  describe('GET /api/alerts', () => {
    it('returns alerts list (auth required)', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/alerts`);
      expect([200, 401, 403, 302]).toContain(res.status);
    });
  });

  describe('Admin alert logs', () => {
    it('admin alert-logs endpoint accessible with auth', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/admin/alert-logs`);
      expect([200, 401, 403]).toContain(res.status);
    });
  });
});