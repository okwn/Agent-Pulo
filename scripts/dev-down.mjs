#!/usr/bin/env node
// dev-down.mjs - Stop PULO local development environment

import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = new URL('.', import.meta.url).pathname;
const GENERATED_ENV = join(PROJECT_ROOT, '.env.local.generated');

async function main() {
  console.log('\n🛑 PULO Local Development Teardown\n' + '─'.repeat(50));

  // Stop docker compose
  console.log('\n📦 Stopping containers...');
  try {
    execSync('docker compose down', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    console.log('  ✅ Containers stopped');
  } catch {
    console.log('  ℹ️  No containers running or docker compose not available');
  }

  // Optionally remove generated env
  if (existsSync(GENERATED_ENV)) {
    const args = process.argv.slice(2);
    if (args.includes('--clean') || args.includes('-c')) {
      unlinkSync(GENERATED_ENV);
      console.log('  🗑️  Removed .env.local.generated');
    }
  }

  console.log('\n✅ PULO stack stopped');
  console.log('   Run `pnpm dev:local` to start again\n');
}

main();