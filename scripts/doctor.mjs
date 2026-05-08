#!/usr/bin/env node
/**
 * doctor.mjs
 * Environment diagnostic for PULO.
 * Checks: Node version, pnpm, Docker, env vars, ports, .env existence, git secrets.
 */

import { readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

async function checkNodeVersion() {
  const version = process.version;
  const match = version.match(/^v(\d+)\.(\d+)/);
  const major = parseInt(match?.[1] ?? '0', 10);
  const minor = parseInt(match?.[2] ?? '0', 10);
  const ok = major > 20 || (major === 20 && minor >= 12);
  return { name: 'Node.js', expected: '>=20.12.0', actual: version, pass: ok };
}

async function checkPnpm() {
  try {
    const { execSync } = await import('child_process');
    const version = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    return { name: 'pnpm', expected: '>=9', actual: version, pass: true };
  } catch {
    return { name: 'pnpm', expected: '>=9', actual: 'NOT FOUND', pass: false };
  }
}

async function checkDocker() {
  try {
    const { execSync } = await import('child_process');
    execSync('docker --version', { encoding: 'utf8' });
    return { name: 'Docker', expected: 'available', actual: 'found', pass: true };
  } catch {
    return { name: 'Docker', expected: 'available', actual: 'NOT FOUND', pass: false };
  }
}

async function checkDockerCompose() {
  try {
    const { execSync } = await import('child_process');
    execSync('docker compose version', { encoding: 'utf8' });
    return { name: 'Docker Compose', expected: 'available', actual: 'found', pass: true };
  } catch {
    try {
      const { execSync } = await import('child_process');
      execSync('docker-compose --version', { encoding: 'utf8' });
      return { name: 'Docker Compose', expected: 'available', actual: 'found', pass: true };
    } catch {
      return { name: 'Docker Compose', expected: 'available', actual: 'NOT FOUND', pass: false };
    }
  }
}

async function checkEnvFile() {
  const root = await findRepoRoot();
  const candidates = ['.env', '.env.local'];
  for (const name of candidates) {
    try {
      await stat(join(root, name));
      return { name: '.env file', expected: 'should exist', actual: `FOUND: ${name}`, pass: true };
    } catch { /* try next */ }
  }
  return { name: '.env file', expected: 'should exist (copy from .env.example)', actual: 'NOT FOUND', pass: false };
}

async function checkRequiredEnvVars() {
  const root = await findRepoRoot();
  let env = {};
  try {
    const buf = await readFile(join(root, '.env'), 'utf8');
    for (const line of buf.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* .env may not exist yet */ }

  const required = [
    'NEYNAR_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
    'DATABASE_URL', 'REDIS_URL',
  ];
  const missing = required.filter(k => !env[k] || env[k] === '');
  const pass = missing.length === 0;
  return {
    name: 'Required env vars',
    expected: required.join(', '),
    actual: pass ? 'all present' : `MISSING: ${missing.join(', ')}`,
    pass,
  };
}

async function checkPorts() {
  const net = await import('node:net');
  const ports = [
    { name: 'Postgres', port: 5544 },
    { name: 'Redis', port: 6388 },
  ];
  const results = [];
  for (const { name, port } of ports) {
    const free = await new Promise(r => {
      const s = net.createServer();
      s.once('error', () => r(false));
      s.once('listening', () => { s.close(() => r(true)); });
      s.listen(port, '0.0.0.0');
    });
    results.push({ name, port, free, pass: free });
  }
  return results;
}

async function checkGitSecrets() {
  const root = await findRepoRoot();
  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]{20,}/,
    /sk-ant-[a-zA-Z0-9]{20,}/,
    /0x[a-fA-F0-9]{64}/,
    /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/,
  ];
  let trackedFiles = [];
  try {
    const { execSync } = await import('child_process');
    trackedFiles = execSync('git ls-files', { encoding: 'utf8', cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
      .split('\n').filter(Boolean);
  } catch {
    return {
      name: 'Git secret scan',
      expected: 'no secrets in tracked files',
      actual: 'Not a git repo — skipped',
      pass: true,
    };
  }

  const violations = [];
  for (const file of trackedFiles) {
    try {
      const content = await readFile(join(root, file), 'utf8');
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          violations.push(`${file}: matches ${pattern}`);
        }
      }
    } catch { /* skip unreadable */ }
  }
  return {
    name: 'Git secret scan',
    expected: 'no secrets in tracked files',
    actual: violations.length === 0 ? 'clean' : `VIOLATIONS: ${violations.join('; ')}`,
    pass: violations.length === 0,
  };
}

async function checkPackageJsonScripts() {
  const root = await findRepoRoot();
  try {
    const content = await readFile(join(root, 'package.json'), 'utf8');
    const pkg = JSON.parse(content);
    const hasScripts = pkg.scripts && Object.keys(pkg.scripts).length > 0;
    return {
      name: 'package.json scripts',
      expected: 'scripts present (dev, build, start)',
      actual: hasScripts ? Object.keys(pkg.scripts).join(', ') : 'NONE FOUND',
      pass: hasScripts,
    };
  } catch {
    return { name: 'package.json scripts', expected: 'present', actual: 'NOT FOUND', pass: false };
  }
}

async function findRepoRoot() {
  return process.cwd();
}

async function main() {
  console.log('PULO Environment Doctor\n' + '─'.repeat(50));

  const checks = [
    checkNodeVersion(),
    checkPnpm(),
    checkDocker(),
    checkDockerCompose(),
    checkEnvFile(),
    checkRequiredEnvVars(),
    checkPackageJsonScripts(),
    checkGitSecrets(),
  ];

  const results = await Promise.all(checks);
  const portChecks = await checkPorts();

  let allPass = true;
  for (const r of [...results, ...portChecks]) {
    const icon = r.pass ? '✓' : '✗';
    const isPortCheck = r.port !== undefined;
    const label = isPortCheck ? `${r.name} (:${r.port})` : r.name;
    console.log(`[${icon}] ${label}`);
    if (isPortCheck) {
      console.log(`    Expected: available`);
      console.log(`    Actual:   ${r.free ? 'free' : 'IN USE'}`);
    } else {
      if (r.expected) console.log(`    Expected: ${r.expected}`);
      if (r.actual !== undefined) console.log(`    Actual:   ${r.actual}`);
    }
    if (!r.pass) allPass = false;
  }

  console.log('─'.repeat(50));
  console.log(allPass ? 'RESULT: PASS — environment looks healthy' : 'RESULT: FAIL — fix issues above');
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error('Doctor error:', err.message);
  process.exit(1);
});