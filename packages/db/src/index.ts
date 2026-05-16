// @pulo/db — Database client singleton

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export { schema };
export { userRepository } from './repositories/users.js';
export { eventRepository } from './repositories/events.js';
export { runRepository } from './repositories/events.js';
export { alertRepository } from './repositories/alerts.js';
export { preferencesRepository } from './repositories/users.js';
export { truthCheckRepository } from './repositories/truth.js';
export { radarTrendRepository, radarKeywordRepository, radarChannelRepository } from './repositories/radar.js';

export function getDB() {
  if (!_db) {
    const url = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5544/pulo';
    _client = postgres(url, { max: 10 });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export async function pingDB(): Promise<boolean> {
  const db = getDB();
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export async function closeDB() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

export type DB = ReturnType<typeof getDB>;