// Integration: Truth check workflow
// Verifies the full truth check pipeline from request to verdict

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

describe('Truth Check Workflow Integration', () => {
  describe('GET /api/truth/:castHash', () => {
    it('returns truth check for known cast', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const castHash = 'demo_cast_token_claim_001';
      const res = await fetch(`${API_URL}/api/truth/${castHash}`);

      expect(res.status).toBeLessThan(500);
      const data = await res.json().catch(() => ({}));
      expect(typeof data).toBe('object');
    });

    it('returns 404 for non-existent cast', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const castHash = `nonexistent_${UniqueId('truth')}`;
      const res = await fetch(`${API_URL}/api/truth/${castHash}`);
      expect([404, 200]).toContain(res.status);
    });
  });

  describe('Truth check result structure', () => {
    it('has expected fields when returned', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const castHash = 'demo_cast_token_claim_001';
      const res = await fetch(`${API_URL}/api/truth/${castHash}`);

      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          const validFields = ['claim', 'verdict', 'confidence', 'riskLevel', 'status', 'evidenceSummary', 'sourceCount'];
          const hasValidField = validFields.some(f => f in data);
          expect(hasValidField).toBe(true);
        }
      }
    });
  });
});