#!/usr/bin/env node
// print-ports.mjs - Detect and print port usage

import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = new URL('.', import.meta.url).pathname;

function loadEnv(path) {
  try {
    const content = readFileSync(path, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) env[match[1].trim()] = match[2].trim();
    });
    return env;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(join(PROJECT_ROOT, '.env')), ...loadEnv(join(PROJECT_ROOT, '.env.local')) };

const PREFERRED_PORTS = {
  PULO_API_PORT: parseInt(env.PULO_API_PORT) || 4311,
  PULO_WEB_PORT: parseInt(env.PULO_WEB_PORT) || 3000,
  PULO_WORKER_PORT: parseInt(env.PULO_WORKER_PORT) || 4321,
  PULO_POSTGRES_PORT: parseInt(env.PULO_POSTGRES_PORT) || 5432,
  PULO_REDIS_PORT: parseInt(env.PULO_REDIS_PORT) || 6379,
};

const DETECTED = {};
const OCCUPIED = {};

async function isPortOccupied(port) {
  const { default: net } = await import('net');
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '0.0.0.0');
  });
}

async function checkPort(name, preferred) {
  const occupied = await isPortOccupied(preferred);
  if (occupied) {
    // Find a free port
    let freePort = preferred + 1;
    while (freePort < preferred + 100) {
      if (!await isPortOccupied(freePort)) break;
      freePort++;
    }
    OCCUPIED[name] = preferred;
    DETECTED[name] = freePort;
  } else {
    DETECTED[name] = preferred;
  }
}

console.log('\n🔍 PULO Port Detection\n' + '─'.repeat(50));

const checkPromises = Object.entries(PREFERRED_PORTS).map(([name, port]) =>
  checkPort(name, port).then(() => null)
);
await Promise.all(checkPromises);

console.log('\nPreferred Ports Configuration:');
Object.entries(PREFERRED_PORTS).forEach(([name, port]) => {
  const status = OCCUPIED[name] ? '⚠️  OCCUPIED' : '✅ Available';
  console.log(`  ${name}: ${port} ${status}`);
});

console.log('\nDetected Ports (for .env.local.generated):');
Object.entries(DETECTED).forEach(([name, port]) => {
  const note = OCCUPIED[name] ? ` (was ${OCCUPIED[name]}, shifted)` : ' (preferred)';
  console.log(`  ${name}=${port}${note}`);
});

if (Object.keys(OCCUPIED).length > 0) {
  console.log('\n⚠️  Some preferred ports are occupied by other processes.');
  console.log('   Detected free ports will be written to .env.local.generated');
}

// Write to .env.local.generated
const lines = ['# Auto-generated local ports (do not commit)'];
Object.entries(DETECTED).forEach(([name, port]) => {
  lines.push(`${name}=${port}`);
});
lines.push('');
lines.push('# PostgreSQL');
lines.push(`POSTGRES_USER=${env.POSTGRES_USER || 'pulo'}`);
lines.push(`POSTGRES_PASSWORD=${env.POSTGRES_PASSWORD || 'pulo_dev_password'}`);
lines.push(`POSTGRES_DB=${env.POSTGRES_DB || 'pulo_dev'}`);
lines.push('');
lines.push('# Redis');
lines.push('REDIS_URL=redis://localhost:6379');

const generatedPath = join(PROJECT_ROOT, '.env.local.generated');
const { writeFileSync } = await import('fs');
writeFileSync(generatedPath, lines.join('\n'));

console.log(`\n📝 Wrote port config to .env.local.generated`);

console.log('\n📋 Final Port Mapping:');
console.log('─'.repeat(50));
console.log(`  API:     http://localhost:${DETECTED.PULO_API_PORT}`);
console.log(`  Web:     http://localhost:${DETECTED.PULO_WEB_PORT}`);
console.log(`  Worker:  http://localhost:${DETECTED.PULO_WORKER_PORT}`);
console.log(`  Postgres: localhost:${DETECTED.PULO_POSTGRES_PORT}`);
console.log(`  Redis:   localhost:${DETECTED.PULO_REDIS_PORT}`);
console.log('─'.repeat(50) + '\n');

export { DETECTED, OCCUPIED, PREFERRED_PORTS };