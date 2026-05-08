#!/usr/bin/env node
/**
 * find-free-port.mjs
 * Discovers a free port in a range, printing JSON to stdout.
 *
 * Usage:
 *   node scripts/find-free-port.mjs --port 4310 --range-start 43100 --range-end 43199
 *   node scripts/find-free-port.mjs --port 4311
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_PORT = 0;
const DEFAULT_RANGE_START = 0;
const DEFAULT_RANGE_END = 65535;

function parseArgs(argv) {
  const args = { port: DEFAULT_PORT, rangeStart: DEFAULT_RANGE_START, rangeEnd: DEFAULT_RANGE_END };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--port' && i + 1 < argv.length) args.port = parseInt(argv[i + 1], 10);
    if (argv[i] === '--range-start' && i + 1 < argv.length) args.rangeStart = parseInt(argv[i + 1], 10);
    if (argv[i] === '--range-end' && i + 1 < argv.length) args.rangeEnd = parseInt(argv[i + 1], 10);
  }
  return args;
}

async function isPortFree(port) {
  const net = await import('node:net');
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(() => resolve(true)); });
    server.listen(port, '0.0.0.0');
  });
}

async function findFreePort(requested, rangeStart, rangeEnd) {
  // Try requested port first
  if (await isPortFree(requested)) return requested;
  // Then scan forward in range
  for (let port = rangeStart; port <= rangeEnd; port++) {
    if (port === requested) continue; // already checked
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found in range ${rangeStart}–${rangeEnd}`);
}

async function main() {
  const args = parseArgs(process.argv);
  try {
    const port = await findFreePort(args.port, args.rangeStart, args.rangeEnd);
    const result = {
      requested: args.port || null,
      found: port,
      rangeStart: args.rangeStart || null,
      rangeEnd: args.rangeEnd || null,
    };
    console.log(JSON.stringify(result));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();