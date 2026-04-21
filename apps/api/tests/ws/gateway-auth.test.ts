import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { authenticateSocket } from '../../src/ws/gateway.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

function fakeSocket(token?: string) {
  return {
    handshake: { auth: token ? { token } : {} },
    data: {} as { userId?: string },
  };
}

describe('Socket.io gateway — authenticateSocket()', () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it('accepts a valid dev-test token and stamps userId on socket.data', async () => {
    const original = process.env.ALLOW_DEV_TOKENS;
    process.env.ALLOW_DEV_TOKENS = 'true';
    const seeded = await seedUser({ firebaseUid: 'dev-test-ws1', phone: '+912000050001', username: 'wssock1' });
    const socket = fakeSocket('dev-test-ws1');
    let resolved: Error | undefined;
    await authenticateSocket(socket, (err) => { resolved = err; });
    expect(resolved).toBeUndefined();
    expect(socket.data.userId).toBe(seeded.id);
    process.env.ALLOW_DEV_TOKENS = original;
  });

  it('rejects when handshake.auth.token is missing', async () => {
    const socket = fakeSocket();
    let resolved: Error | undefined;
    await authenticateSocket(socket, (err) => { resolved = err; });
    expect(resolved?.message).toMatch(/auth/i);
  });

  it('rejects an unknown token', async () => {
    const original = process.env.ALLOW_DEV_TOKENS;
    process.env.ALLOW_DEV_TOKENS = 'true';
    const socket = fakeSocket('dev-test-bogus');
    let resolved: Error | undefined;
    await authenticateSocket(socket, (err) => { resolved = err; });
    expect(resolved?.message).toMatch(/auth/i);
    process.env.ALLOW_DEV_TOKENS = original;
  });
});
