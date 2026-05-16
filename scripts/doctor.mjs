#!/usr/bin/env node
/**
 * doctor.mjs — Enhanced pre-live readiness checker for PULO
 * Checks environment, modes, required keys, storage, and service connectivity.
 * Output: PASS | WARN | FAIL | LIVE_BLOCKER
 */

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';

const RESET = '\x1b[0m', RED = '\x1b[31m', YELLOW = '\x1b[33m', GREEN = '\x1b[32m', CYAN = '\x1b[36m';
const PASS = `${GREEN}PASS${RESET}`, WARN = `${YELLOW}WARN${RESET}`, FAIL = `${RED}FAIL${RESET}`, BLOCK = `${RED}BLOCK${RESET}`;

function status(level, msg) {
  const icon = level === 'PASS' ? PASS : level === 'WARN' ? WARN : level === 'FAIL' ? FAIL : BLOCK;
  console.log(`  [${icon}]  ${msg}`);
}

async function loadEnv() {
  const root = process.cwd();
  const candidates = ['.env', '.env.local'];
  let env = {};
  for (const name of candidates) {
    try {
      const buf = await readFile(join(root, name), 'utf8');
      for (const line of buf.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m) env[m[1]] = m[2].trim();
      }
      break;
    } catch { /* try next */ }
  }
  return env;
}

async function checkTCP(host, port) {
  const net = await import('node:net');
  return new Promise(r => {
    const s = net.createServer();
    s.once('error', () => r(false));
    s.once('listening', () => { s.close(() => r(true)); });
    s.listen(port, host);
  });
}

async function checkRedis(url) {
  try {
    const { default: Redis } = await import('ioredis');
    const r = new Redis(url, { lazyConnect: true, connectTimeout: 3000, maxRetriesPerRequest: 1 });
    await r.ping();
    await r.quit();
    return true;
  } catch { return false; }
}

async function checkDB(url) {
  try {
    const { createClient } = await import('pg');
    const client = createClient({ connectionString: url, connectionTimeoutMillis: 3000 });
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch { return false; }
}

async function main() {
  const root = process.cwd();
  console.log(`\n${CYAN}PULO Pre-Live Readiness Doctor${RESET}`);
  console.log(`${'─'.repeat(50)}`);

  const env = await loadEnv();
  const farcasterMode = env.PULO_FARCASTER_MODE ?? 'mock';
  const llmMode = env.PULO_LLM_MODE ?? 'mock';
  const notificationMode = env.PULO_NOTIFICATION_MODE ?? 'mock';
  const searchMode = env.PULO_SEARCH_MODE ?? 'mock';
  const appEnv = env.PULO_APP_ENV ?? 'local';
  const isLive = farcasterMode === 'live' || appEnv === 'production' || appEnv === 'staging';

  let overall = 'PASS', items = [];

  // ── .env exists ────────────────────────────────────────────────────────────
  {
    let found = false;
    for (const n of ['.env', '.env.local']) {
      try { await stat(join(root, n)); found = true; break; } catch { /* next */ }
    }
    if (!found) { overall = 'FAIL'; items.push(['FAIL', `.env file not found — copy from .env.example`]); }
    else items.push(['PASS', `.env file found`]);
  }

  // ── DEMO_AUTH_SECRET ──────────────────────────────────────────────────────
  {
    const secret = env.DEMO_AUTH_SECRET ?? '';
    const isDefault = secret === '' || secret === 'demo-secret-change-in-production';
    if (isDefault) {
      if (isLive) { overall = 'FAIL'; items.push(['FAIL', `DEMO_AUTH_SECRET is default — MUST change before production`]); }
      else items.push(['WARN', `DEMO_AUTH_SECRET is default (warning in dev, fail in production)`]);
    } else items.push(['PASS', `DEMO_AUTH_SECRET is set`]);
  }

  // ── Mode checks ────────────────────────────────────────────────────────────
  items.push(['PASS', `PULO_FARCASTER_MODE=${farcasterMode}`]);
  items.push(['PASS', `PULO_LLM_MODE=${llmMode}`]);
  items.push(['PASS', `PULO_SEARCH_MODE=${searchMode}`]);
  items.push(['PASS', `PULO_NOTIFICATION_MODE=${notificationMode}`]);

  // ── Far caster live key checks ──────────────────────────────────────────
  if (farcasterMode === 'live') {
    if (!env.NEYNAR_API_KEY || env.NEYNAR_API_KEY === '') {
      overall = 'FAIL'; items.push(['FAIL', `NEYNAR_API_KEY required when PULO_FARCASTER_MODE=live`]);
    } else items.push(['PASS', `NEYNAR_API_KEY is set`]);

    if (!env.NEYNAR_WEBHOOK_SECRET || env.NEYNAR_WEBHOOK_SECRET === '') {
      overall = 'FAIL'; items.push(['FAIL', `NEYNAR_WEBHOOK_SECRET required when PULO_FARCASTER_MODE=live`]);
    } else items.push(['PASS', `NEYNAR_WEBHOOK_SECRET is set`]);
  }

  // ── LLM key checks ────────────────────────────────────────────────────────
  if (llmMode === 'openai' || llmMode === 'auto') {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === '') {
      overall = 'FAIL'; items.push(['FAIL', `OPENAI_API_KEY required when PULO_LLM_MODE=${llmMode}`]);
    } else items.push(['PASS', `OPENAI_API_KEY is set`]);
  }
  if (llmMode === 'anthropic' || llmMode === 'auto') {
    if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY === '') {
      overall = 'FAIL'; items.push(['FAIL', `ANTHROPIC_API_KEY required when PULO_LLM_MODE=${llmMode}`]);
    } else items.push(['PASS', `ANTHROPIC_API_KEY is set`]);
  }

  // ── Far caster bot signer ────────────────────────────────────────────────
  if (farcasterMode === 'live' && !env.FARCASTER_BOT_SIGNER_UUID) {
    overall = 'WARN'; items.push(['WARN', `FARCASTER_BOT_SIGNER_UUID not set — bot cannot publish live`]);
  } else if (env.FARCASTER_BOT_SIGNER_UUID) {
    items.push(['PASS', `FARCASTER_BOT_SIGNER_UUID is set`]);
  }

  // ── Storage checks ──────────────────────────────────────────────────────
  const budgetStorage = env.PULO_BUDGET_STORAGE ?? 'memory';
  const rateLimitStorage = env.PULO_RATE_LIMIT_STORAGE ?? 'memory';

  if (budgetStorage === 'memory' && isLive) {
    items.push(['WARN', `PULO_BUDGET_STORAGE=memory — daily budget resets on restart (use redis)`]);
  } else {
    items.push(['PASS', `PULO_BUDGET_STORAGE=${budgetStorage}`]);
  }

  if (rateLimitStorage === 'memory' && isLive) {
    items.push(['WARN', `PULO_RATE_LIMIT_STORAGE=memory — rate limits reset on restart`]);
  } else {
    items.push(['PASS', `PULO_RATE_LIMIT_STORAGE=${rateLimitStorage}`]);
  }

  // ── Redis connectivity (if Redis storage selected) ──────────────────────
  if (budgetStorage === 'redis' || rateLimitStorage === 'redis') {
    const redisUrl = env.REDIS_URL ?? 'redis://localhost:6379';
    const ok = await checkRedis(redisUrl);
    if (!ok) {
      overall = 'FAIL'; items.push(['FAIL', `Redis not reachable at ${redisUrl} — cannot use Redis storage`]);
    } else items.push(['PASS', `Redis reachable at ${redisUrl}`]);
  }

  // ── Database connectivity ────────────────────────────────────────────────
  if (env.DATABASE_URL) {
    const ok = await checkDB(env.DATABASE_URL);
    if (!ok) { overall = 'FAIL'; items.push(['FAIL', `Database not reachable — check DATABASE_URL`]); }
    else items.push(['PASS', `Database reachable`]);
  } else {
    items.push(['WARN', `DATABASE_URL not set`]);
  }

  // ── Search live key ──────────────────────────────────────────────────────
  if (searchMode === 'tavily' && !env.TAVILY_API_KEY) {
    items.push(['WARN', `TAVILY_API_KEY not set — search will use mock mode`]);
  }
  if (searchMode === 'serpapi' && !env.SERPAPI_API_KEY) {
    items.push(['WARN', `SERPAPI_API_KEY not set — search will use mock mode`]);
  }

  // ── Notification live key ────────────────────────────────────────────────
  if (notificationMode === 'live') {
    if (!env.NEYNAR_API_KEY) {
      items.push(['WARN', `Direct Cast / MiniApp: NEYNAR_API_KEY needed for live notifications`]);
    }
  }

  // ── Live blockers ───────────────────────────────────────────────────────
  if (isLive) {
    if (!env.NEYNAR_API_KEY) items.push(['BLOCK', `LIVE_BLOCKER: Far caster live mode blocked — NEYNAR_API_KEY missing`]);
    if (!env.NEYNAR_WEBHOOK_SECRET) items.push(['BLOCK', `LIVE_BLOCKER: NEYNAR_WEBHOOK_SECRET missing — webhook verification unavailable`]);
  }

  // ── Print results ────────────────────────────────────────────────────────
  console.log('');
  for (const [level, msg] of items) {
    status(level, msg);
  }
  console.log('');
  console.log(`${'─'.repeat(50)}`);

  if (overall === 'PASS') {
    console.log(`[${PASS}]  RESULT: PASS — environment looks healthy`);
  } else if (overall === 'FAIL') {
    console.log(`[${FAIL}]  RESULT: FAIL — fix failures above`);
  } else {
    console.log(`[${WARN}]  RESULT: WARN — warnings present (check if acceptable)`);
  }

  if (isLive && items.some(([l]) => l === 'BLOCK')) {
    console.log(`\n[${BLOCK}]  LIVE_BLOCKERS detected — resolve before live key testing`);
  }

  process.exit(overall === 'PASS' ? 0 : 1);
}

main().catch(err => { console.error('Doctor error:', err.message); process.exit(1); });