// Integration test setup helpers
// Shared utilities for integration test setup and teardown

import { spawn, type ChildProcess } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

export interface TestServices {
  apiUrl: string;
  dbUrl: string;
}

/**
 * Check if API is reachable
 */
export async function isApiReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Start the dev services (api + required infra) for integration tests
 */
export async function startTestServices(): Promise<TestServices> {
  const apiUrl = process.env.PULO_API_URL ?? 'http://localhost:4311';
  const dbUrl = process.env.DATABASE_URL ?? '';

  return { apiUrl, dbUrl };
}

/**
 * Wait for the API to be ready (health check passes)
 */
export async function waitForApi(url: string, maxAttempts = 20, intervalMs = 500): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const reachable = await isApiReachable(url);
    if (reachable) return;
    await sleep(intervalMs);
  }
  throw new Error(`API at ${url} did not become ready in ${maxAttempts * intervalMs}ms`);
}

/**
 * Send a mock webhook payload to the test API
 */
export async function sendWebhook(url: string, payload: object, mockMode = true): Promise<Response | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!mockMode) {
      headers['x-neynar-signature'] = 'test_signature';
      headers['x-webhook-timestamp'] = Date.now().toString();
    }

    return await fetch(`${url}/api/webhook/farcaster`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    return null;
  }
}

/**
 * Reset demo data via the demo:reset script
 */
export async function resetDemoData(force = true): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = force ? ['--force'] : [];
    const child = spawn('node', ['scripts/demo-reset.mjs', ...args], {
      cwd: process.cwd(),
    });
    let output = '';
    child.stdout?.on('data', d => output += d);
    child.stderr?.on('data', d => output += d);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`demo:reset failed: ${output}`));
    });
  });
}

/**
 * Seed demo data via the demo:seed script
 */
export async function seedDemoData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/demo-seed.mjs'], {
      cwd: process.cwd(),
    });
    let output = '';
    child.stdout?.on('data', d => output += d);
    child.stderr?.on('data', d => output += d);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`demo:seed failed: ${output}`));
    });
  });
}

/**
 * Generate a unique test idempotency key
 */
export function uniqueId(prefix = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Alias for readability
export { uniqueId as UniqueId };