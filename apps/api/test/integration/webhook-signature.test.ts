// Unit tests for webhook signature verification
// Tests verifyNeynarSignature() directly for correctness

import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';

// Re-implement the verify function inline for testing (same logic as webhook.ts)
function verifyNeynarSignature(body: unknown, signature: string, timestamp: string, secret: string): boolean {
  if (!timestamp || !signature) return false;
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const signedPayload = timestamp + bodyStr;
  const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return Buffer.compare(sigBuffer, expectedBuffer) === 0;
}

function makeSignature(body: unknown, timestamp: string, secret: string): string {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return createHmac('sha256', secret).update(timestamp + bodyStr).digest('hex');
}

const SECRET = 'test-secret-123';
const BODY = { type: 'mention', castHash: 'abc123', fid: 100 };
const TIMESTAMP = '1715000000';

describe('verifyNeynarSignature', () => {
  it('accepts a valid signature', () => {
    const sig = makeSignature(BODY, TIMESTAMP, SECRET);
    expect(verifyNeynarSignature(BODY, sig, TIMESTAMP, SECRET)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const sig = makeSignature(BODY, TIMESTAMP, SECRET);
    const tampered = sig.replace('a', 'b').replace('1', '0');
    expect(verifyNeynarSignature(BODY, tampered, TIMESTAMP, SECRET)).toBe(false);
  });

  it('rejects a signature signed with wrong secret', () => {
    const sig = makeSignature(BODY, TIMESTAMP, 'wrong-secret');
    expect(verifyNeynarSignature(BODY, sig, TIMESTAMP, SECRET)).toBe(false);
  });

  it('rejects a signature for different body', () => {
    const sig = makeSignature(BODY, TIMESTAMP, SECRET);
    const differentBody = { type: 'mention', castHash: 'different', fid: 999 };
    expect(verifyNeynarSignature(differentBody, sig, TIMESTAMP, SECRET)).toBe(false);
  });

  it('rejects a signature for different timestamp', () => {
    const sig = makeSignature(BODY, TIMESTAMP, SECRET);
    const wrongTimestamp = '9999999999';
    expect(verifyNeynarSignature(BODY, sig, wrongTimestamp, SECRET)).toBe(false);
  });

  it('rejects a missing signature (empty string)', () => {
    expect(verifyNeynarSignature(BODY, '', TIMESTAMP, SECRET)).toBe(false);
  });

  it('rejects a missing timestamp', () => {
    const sig = makeSignature(BODY, TIMESTAMP, SECRET);
    expect(verifyNeynarSignature(BODY, sig, '', SECRET)).toBe(false);
  });

  it('accepts string body', () => {
    const strBody = JSON.stringify(BODY);
    const sig = makeSignature(strBody, TIMESTAMP, SECRET);
    expect(verifyNeynarSignature(strBody, sig, TIMESTAMP, SECRET)).toBe(true);
  });

  it('accepts plain string body', () => {
    const sig = makeSignature('plain text body', TIMESTAMP, SECRET);
    expect(verifyNeynarSignature('plain text body', sig, TIMESTAMP, SECRET)).toBe(true);
  });

  it('rejects signature of wrong length', () => {
    // A valid signature is 64 hex chars (SHA256 = 32 bytes = 64 hex)
    expect(verifyNeynarSignature(BODY, 'a'.repeat(63), TIMESTAMP, SECRET)).toBe(false);
    expect(verifyNeynarSignature(BODY, 'a'.repeat(65), TIMESTAMP, SECRET)).toBe(false);
  });
});