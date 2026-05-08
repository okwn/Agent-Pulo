// pipeline/dedupe.ts — Deduplication guard using in-memory and DB dedup keys

import { sql } from 'drizzle-orm';
import type { NormalizedEvent } from '@pulo/farcaster';
import { getDB, schema } from '@pulo/db';
import { DeduplicationError } from '../errors.js';

const { agentEvents } = schema;

// In-memory dedup for in-flight events (short window)
const inFlightEvents = new Set<string>();

function makeDedupeKey(event: NormalizedEvent): string {
  if (event.type === 'mention' || event.type === 'reply') {
    return `${event.type}:${event.castHash}`;
  }
  // DM type
  return `dm:${event.fid}:${event.timestamp}`;
}

export class DedupeGuard {
  /** Check if an event is already in-flight. Throws DeduplicationError if so. */
  check(event: NormalizedEvent): string {
    const key = makeDedupeKey(event);
    if (inFlightEvents.has(key)) {
      throw new DeduplicationError(key);
    }
    return key;
  }

  markInFlight(key: string): void {
    inFlightEvents.add(key);
  }

  clearInFlight(key: string): void {
    inFlightEvents.delete(key);
  }

  /** Check DB for prior processed event with same dedupe key */
  async wasProcessed(key: string): Promise<boolean> {
    const db = getDB();
    const [existing] = await db
      .select({ id: agentEvents.id })
      .from(agentEvents)
      .where(sql`${agentEvents.dedupeKey} = ${key}`)
      .limit(1);
    return existing !== undefined;
  }
}

export const dedupeGuard = new DedupeGuard();