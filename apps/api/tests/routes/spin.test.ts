import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';

describe('POST /api/v1/spin', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns pointsAwarded on first spin', async () => {
    await seedUser({
      firebaseUid: 'dev-test-sr1',
      phone: '+919900000080',
      username: 'tsr1',
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/spin',
      headers: { Authorization: devToken('dev-test-sr1') },
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().pointsAwarded).toBe('number');
  });

  it('returns 409 on second spin of day', async () => {
    await seedUser({
      firebaseUid: 'dev-test-sr2',
      phone: '+919900000081',
      username: 'tsr2',
    });
    await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/spin',
      headers: { Authorization: devToken('dev-test-sr2') },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/spin',
      headers: { Authorization: devToken('dev-test-sr2') },
    });
    expect(res.statusCode).toBe(409);
  });

  it('GET /spin/status tells you whether you can spin', async () => {
    await seedUser({
      firebaseUid: 'dev-test-sr3',
      phone: '+919900000082',
      username: 'tsr3',
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/spin/status',
      headers: { Authorization: devToken('dev-test-sr3') },
    });
    expect(res.json().canSpin).toBe(true);
  });
});
