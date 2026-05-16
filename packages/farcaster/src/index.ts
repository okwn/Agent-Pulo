// @pulo/farcaster — Abstraction layer over Far provider integrations
// Supports: mock | neynar | warpcast modes
// Never call external APIs in mock mode; fail safely in live mode if keys are missing

export * from './providers/index.js';
export * from './errors.js';
export * from './idempotency.js';
export * from './webhook.js';
export * from './normalize.js';
export {
  getProvider,
  setMode,
  getMode,
  clearProvider,
  requireLiveProvider,
  requireMockProvider,
  setMockRateLimit,
  getMockRateLimitConfig,
  resetMockRateLimit,
  type MockRateLimitConfig,
  type FarMode,
} from './factory.js';

export {
  withIdempotencyKey,
  makeIdempotencyKey,
  parseIdempotencyKey,
  isValidIdempotencyKey,
} from './idempotency.js';