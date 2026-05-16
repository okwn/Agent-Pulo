// Integration: Mock Far caster mention webhook
// Verifies that a mention event is processed correctly through the system

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

describe('Mention Webhook Integration', () => {
  describe('POST /api/webhook/farcaster', () => {
    it('accepts mention event in mock mode', async () => {
      const reachable = await isReachable();
      if (!reachable) return; // Skip if API not running

      const castHash = `test_mention_${UniqueId('mention')}`;

      const payload = {
        type: 'mention',
        fid: 100,
        username: 'alice_farcaster',
        castHash,
        text: 'Hey @pulo summarize this thread please 🙏',
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(`${API_URL}/api/webhook/farcaster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.received).toBe(true);
    });

    it('rejects mention without body', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const res = await fetch(`${API_URL}/api/webhook/farcaster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/webhook/farcaster (deduplication)', () => {
    it('accepts duplicate cast hash in mock mode (dedup at app level)', async () => {
      const reachable = await isReachable();
      if (!reachable) return;

      const castHash = `test_dedup_${UniqueId('dedup')}`;

      const payload = {
        type: 'mention',
        fid: 100,
        castHash,
        text: 'First mention',
      };

      const first = await fetch(`${API_URL}/api/webhook/farcaster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(first.ok).toBe(true);

      const second = await fetch(`${API_URL}/api/webhook/farcaster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, text: 'Duplicate mention' }),
      });
      expect(second.ok).toBe(true);
    });
  });
});