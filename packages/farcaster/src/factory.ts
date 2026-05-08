// farcaster/factory.ts — Provider factory with mode gating

import type { IFarcasterProvider } from './providers/interfaces.js';
import { MockFarcasterProvider, NeynarFarcasterProvider, type NeynarProviderConfig } from './providers/index.js';
import { MissingCredentialsError, ModeMismatchError } from './errors.js';

export type FarMode = 'mock' | 'live';

let _provider: IFarcasterProvider | null = null;
let _mode: FarMode = 'mock';

export function getMode(): FarMode {
  return _mode;
}

export function setMode(mode: FarMode): void {
  _mode = mode;
}

export function getProvider(): IFarcasterProvider {
  if (_provider) return _provider;

  if (_mode === 'mock') {
    const provider = new MockFarcasterProvider();
    _provider = provider;
    return provider;
  }

  // Live mode — require Neynar config
  const apiKey = process.env.NEYNAR_API_KEY ?? '';
  if (!apiKey || apiKey.startsWith('PLACEHOLDER') || apiKey === 'undefined') {
    throw new MissingCredentialsError('Neynar', 'NEYNAR_API_KEY');
  }

  const config: NeynarProviderConfig = {
    apiKey,
    clientId: process.env.NEYNAR_CLIENT_ID,
    webhookSecret: process.env.NEYNAR_WEBHOOK_SECRET,
    signerUuid: process.env.FARCASTER_BOT_SIGNER_UUID,
  };

  const provider = new NeynarFarcasterProvider(config);
  _provider = provider;
  return provider;
}

export function clearProvider(): void {
  _provider = null;
}

export function requireLiveProvider(): IFarcasterProvider {
  const p = getProvider();
  if (p.mode === 'mock') {
    throw new ModeMismatchError('live', 'mock');
  }
  return p;
}

export function requireMockProvider(): IFarcasterProvider {
  const p = getProvider();
  if (p.mode === 'live') {
    throw new ModeMismatchError('mock', 'live');
  }
  return p;
}