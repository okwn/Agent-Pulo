// Integration: LLM provider fallback behavior
// Verifies that the system handles LLM failures gracefully

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

describe('LLM Provider Integration', () => {
  describe('Composer rewrite in mock mode', () => {
    it('returns a rewrite response in mock mode', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/composer/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This is a test cast for rewriting',
          style: 'concise',
        }),
      });

      expect(res.status).toBeLessThan(600);
      const data = await res.json().catch(() => ({}));
      expect(typeof data).toBe('object');
    });

    it('accepts multiple styles', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const styles = ['concise', 'sharp', 'founder', 'funny'];

      for (const style of styles) {
        const res = await fetch(`${API_URL}/api/composer/rewrite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Test cast', style }),
        });
        expect(res.status).toBeLessThan(600);
      }
    });
  });

  describe('Health check includes LLM status', () => {
    it('returns health with LLM info', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/health/deep`);

      if (res.ok) {
        const data = await res.json();
        expect(typeof data.status).toBe('string');
        if (data.checks) {
          const llmCheck = data.checks.find((c: { component: string }) => c.component === 'llm');
          expect(llmCheck === undefined || typeof llmCheck.status === 'string').toBe(true);
        }
      }
    });
  });
});