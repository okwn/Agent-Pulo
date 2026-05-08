/**
 * @pulo/db tests
 *
 * Tests that require a live PostgreSQL instance are marked with test.skip
 * and will run only when DATABASE_URL is reachable.
 *
 * To run all tests including DB tests:
 *   1. Start infra: docker compose -f infra/docker/docker-compose.yml up -d
 *   2. Apply migration: PGPASSWORD=password psql -h localhost -p 5544 -U postgres -d pulo -f packages/db/migrations/0000_init_pulo_schema.sql
 *   3. Seed: pnpm --filter @pulo/db db:seed
 *   4. Test: pnpm --filter @pulo/db test
 *
 * To run unit tests only (no DB required):
 *   pnpm --filter @pulo/db exec vitest run --testNamePattern="getDB"
 */

import { describe, it, expect } from 'vitest';
import { getDB } from '../src/index.js';
import { userRepository } from '../src/repositories/users.js';
import { castRepository } from '../src/repositories/casts.js';
import { eventRepository } from '../src/repositories/events.js';
import { truthCheckRepository } from '../src/repositories/truth.js';
import { alertRepository } from '../src/repositories/alerts.js';
import { safetyRepository } from '../src/repositories/safety.js';

const DB_AVAILABLE = process.env.DATABASE_URL != null;
const TEST_DB_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5544/pulo';

function getTestDB() {
  process.env.DATABASE_URL = TEST_DB_URL;
  return getDB();
}

// These tests require a running PostgreSQL instance
const requireDB = DB_AVAILABLE ? describe : describe.skip;

getTestDB(); // Initialize singleton with test URL

describe('db schema', () => {
  it('getDB returns a db instance', () => {
    const db = getDB();
    expect(db).toBeDefined();
  });
});

requireDB('userRepository', () => {
  const db = getTestDB();

  it('findByFid returns undefined for non-existent user', async () => {
    const user = await userRepository.findByFid(db, 99999999);
    expect(user).toBeUndefined();
  });

  it('findAll returns array', async () => {
    const users = await userRepository.findAll(db, 10);
    expect(Array.isArray(users)).toBe(true);
  });

  it('count returns number', async () => {
    const n = await userRepository.count(db);
    expect(typeof n).toBe('number');
  });
});

requireDB('castRepository', () => {
  const db = getTestDB();

  it('findByHash returns undefined for non-existent cast', async () => {
    const cast = await castRepository.findByHash(db, 'non-existent-hash');
    expect(cast).toBeUndefined();
  });

  it('upsertByHash does not throw for new cast data', async () => {
    const cast = await castRepository.upsertByHash(db, {
      castHash: 'test-cast-' + Date.now(),
      authorFid: 1,
      authorUsername: 'testuser',
      text: 'test cast for unit test',
      rawJson: {},
    });
    expect(cast).toBeDefined();
    expect(cast.castHash).toBeDefined();
  });
});

requireDB('eventRepository', () => {
  const db = getTestDB();

  it('enqueueIfNotDuplicate creates new event', async () => {
    const key = `dedupe-test-${Date.now()}`;
    const { event, isNew } = await eventRepository.enqueueIfNotDuplicate(db, {
      source: 'api',
      type: 'mention',
      fid: 12345,
      dedupeKey: key,
      payload: { test: true },
    });
    expect(event).toBeDefined();
    expect(isNew).toBe(true);
  });

  it('enqueueIfNotDuplicate returns existing for duplicate key', async () => {
    const key = `dedupe-test-dup-${Date.now()}`;
    const first = await eventRepository.enqueueIfNotDuplicate(db, {
      source: 'api', type: 'mention', fid: 1, dedupeKey: key, payload: {},
    });
    const second = await eventRepository.enqueueIfNotDuplicate(db, {
      source: 'api', type: 'mention', fid: 1, dedupeKey: key, payload: {},
    });
    expect(first.event.id).toBe(second.event.id);
    expect(second.isNew).toBe(false);
  });
});

requireDB('truthCheckRepository', () => {
  const db = getTestDB();

  it('findByTargetCastHash returns undefined for non-existent', async () => {
    const tc = await truthCheckRepository.findByTargetCastHash(db, 'non-existent-cast');
    expect(tc).toBeUndefined();
  });
});

requireDB('alertRepository', () => {
  const db = getTestDB();

  it('findDeliveryByIdempotencyKey returns undefined for non-existent', async () => {
    const alert = await alertRepository.findDeliveryByIdempotencyKey(db, 'non-existent-key');
    expect(alert).toBeUndefined();
  });
});

requireDB('safetyRepository', () => {
  const db = getTestDB();

  it('flag creates safety record', async () => {
    const flag = await safetyRepository.flag(db, {
      entityType: 'user',
      entityId: '99999',
      reason: 'test-flag-reason',
      severity: 'medium',
      status: 'active',
    });
    expect(flag).toBeDefined();
    expect(flag.reason).toBe('test-flag-reason');
  });
});