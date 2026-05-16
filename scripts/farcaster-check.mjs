#!/usr/bin/env node
// scripts/farcaster-check.mjs — Check Far caster live readiness

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// Load .env manually (avoid dotenv dependency)
try {
  const envPath = join(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* no .env file, use process.env directly */ }

function check_env(name, value) {
  const isSet = value && value !== '' && !value.startsWith('PLACEHOLDER') && value !== 'undefined';
  return { name, value, isSet };
}

function section(title) {
  console.log(`\n${CYAN}${title}${RESET}`);
  console.log('─'.repeat(50));
}

function item(label, ok, detail) {
  const icon = ok ? `${GREEN}✅` : `${RED}❌`;
  const detailStr = detail ? ` — ${detail}` : '';
  console.log(`  ${icon} ${label}${detailStr}`);
}

function warn(label, detail) {
  const icon = `${YELLOW}⚠️`;
  console.log(`  ${icon} ${label} — ${detail}`);
}

section('Provider Mode');

const appEnv = process.env.PULO_APP_ENV ?? 'local';
const farcasterMode = process.env.PULO_FARCASTER_MODE ?? 'mock';
const llmMode = process.env.PULO_LLM_MODE ?? 'mock';

console.log(`  PULO_APP_ENV=${appEnv}`);
console.log(`  PULO_FARCASTER_MODE=${farcasterMode}`);
console.log(`  PULO_LLM_MODE=${llmMode}`);

section('Required Keys for Live Mode');

const checks = [
  check_env('NEYNAR_API_KEY', process.env.NEYNAR_API_KEY),
  check_env('FARCASTER_BOT_SIGNER_UUID', process.env.FARCASTER_BOT_SIGNER_UUID),
  check_env('OPENAI_API_KEY', process.env.OPENAI_API_KEY),
  check_env('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY),
  check_env('TAVILY_API_KEY', process.env.TAVILY_API_KEY),
  check_env('SERPAPI_API_KEY', process.env.SERPAPI_API_KEY),
  check_env('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY),
];

for (const c of checks) {
  item(c.name, c.isSet, c.isSet ? '(set)' : '(missing)');
}

section('Webhook URL');

const webhookUrl = process.env.NEYNAR_WEBHOOK_URL;
if (webhookUrl) {
  item('NEYNAR_WEBHOOK_URL', true, webhookUrl);
} else {
  warn('NEYNAR_WEBHOOK_URL', 'Not set — webhook events will not reach this instance');
}

section('Mode-Specific Readiness');

if (farcasterMode === 'live') {
  if (!checks[0].isSet) warn('FARCASTER_MODE=live but NEYNAR_API_KEY is missing', 'Live Far caster will fail');
  if (!checks[1].isSet) warn('FARCASTER_MODE=live but FARCASTER_BOT_SIGNER_UUID is missing', 'Publishing casts will fail');
  if (webhookUrl) item('Webhook URL configured', true);
  else warn('Webhook URL not configured', 'Neynar cannot send events to this instance');
} else {
  item('FARCASTER_MODE is mock', true, 'No keys required for mock mode');
}

if (llmMode === 'openai' && !checks[2].isSet) warn('PULO_LLM_MODE=openai but OPENAI_API_KEY is missing', 'LLM calls will fail');
if (llmMode === 'anthropic' && !checks[3].isSet) warn('PULO_LLM_MODE=anthropic but ANTHROPIC_API_KEY is missing', 'LLM calls will fail');

section('Summary');

const missingLive = [];
if (farcasterMode === 'live') {
  if (!checks[0].isSet) missingLive.push('NEYNAR_API_KEY');
  if (!checks[1].isSet) missingLive.push('FARCASTER_BOT_SIGNER_UUID');
  if (!webhookUrl) missingLive.push('NEYNAR_WEBHOOK_URL (for inbound events)');
}
if (llmMode === 'openai' && !checks[2].isSet) missingLive.push('OPENAI_API_KEY');
if (llmMode === 'anthropic' && !checks[3].isSet) missingLive.push('ANTHROPIC_API_KEY');

if (missingLive.length === 0) {
  console.log(`  ${GREEN}✅ Ready for live testing${RESET}`);
  if (farcasterMode === 'live') {
    console.log(`  ${GREEN}All required keys for live mode are set.${RESET}`);
    console.log(`  ${YELLOW}Next: configure NEYNAR_WEBHOOK_URL in Neynar dashboard to point to this instance${RESET}`);
  } else {
    console.log(`  ${YELLOW}Switch PULO_FARCASTER_MODE=live to enable real Far caster${RESET}`);
  }
} else {
  console.log(`  ${RED}❌ Missing for live mode:${RESET}`);
  for (const m of missingLive) console.log(`     ${RED}  - ${m}${RESET}`);
}

console.log('');