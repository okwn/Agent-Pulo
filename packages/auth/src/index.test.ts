// @pulo/auth — Auth provider tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDemoSessionToken,
  verifyDemoSessionToken,
  DemoAuthProvider,
  type AuthUser,
} from './src/index.js';

describe('Demo Auth', () => {
  const testUser: AuthUser = {
    id: 1,
    fid: 12345,
    username: 'testuser',
    displayName: 'Test User',
    plan: 'pro',
    isAdmin: false,
  };

  describe('createDemoSessionToken', () => {
    it('creates a valid token', () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const token = createDemoSessionToken(testUser.fid, testUser.username, expiresAt);
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(2);
    });

    it('token contains fid and username', () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const token = createDemoSessionToken(testUser.fid, testUser.username, expiresAt);
      const payload = verifyDemoSessionToken(token);
      expect(payload).toEqual({
        fid: testUser.fid,
        username: testUser.username,
      });
    });
  });

  describe('verifyDemoSessionToken', () => {
    it('rejects tampered token', () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const token = createDemoSessionToken(testUser.fid, testUser.username, expiresAt);
      const tampered = token.slice(0, -5) + 'xxxxx';
      const result = verifyDemoSessionToken(tampered);
      expect(result).toBeNull();
    });

    it('rejects expired token', () => {
      const expired = new Date(Date.now() - 1000);
      const token = createDemoSessionToken(testUser.fid, testUser.username, expired);
      const result = verifyDemoSessionToken(token);
      expect(result).toBeNull();
    });

    it('rejects malformed token', () => {
      expect(verifyDemoSessionToken('not-a-valid-token')).toBeNull();
      expect(verifyDemoSessionToken('')).toBeNull();
    });
  });

  describe('DemoAuthProvider', () => {
    let provider: DemoAuthProvider;

    beforeEach(() => {
      provider = new DemoAuthProvider();
    });

    it('returns user from valid cookie', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const token = createDemoSessionToken(testUser.fid, testUser.username, expiresAt);

      const request = new Request('http://localhost', {
        headers: {
          cookie: `pulo_demo_session=${token}`,
        },
      });

      const user = await provider.getUser(request);
      expect(user).toBeTruthy();
      expect(user!.fid).toBe(testUser.fid);
      expect(user!.username).toBe(testUser.username);
    });

    it('returns null without cookie', async () => {
      const request = new Request('http://localhost');
      const user = await provider.getUser(request);
      expect(user).toBeNull();
    });

    it('creates session with setCookie', async () => {
      const session = await provider.createSession(testUser);
      expect(session.setCookie).toBeTruthy();
      expect(session.setCookie!.name).toBe('pulo_demo_session');
      expect(session.setCookie!.value).toBeTruthy();
    });
  });
});
