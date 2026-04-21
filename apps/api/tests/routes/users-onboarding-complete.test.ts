import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('POST /api/v1/users/me/onboarding/complete', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('first call credits +250 welcome_bonus + +25 daily_checkin (total 275)', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-oc1',
      phone: '+912000040001',
      username: 'oc1',
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding/complete',
      headers: { Authorization: devToken('dev-test-oc1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.pointsCredited).toBe(275);

    const ledger = await prisma.pointsLedger.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: 'asc' },
    });
    const actions = ledger.map((l) => l.actionType).sort();
    expect(actions).toEqual(['daily_checkin', 'welcome_bonus']);
    const totalPoints = ledger.reduce((sum, l) => sum + l.points, 0);
    expect(totalPoints).toBe(275);
  });

  it('second call is idempotent — returns 0 credited and ledger stays at 1 of each', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-oc2',
      phone: '+912000040002',
      username: 'oc2',
    });

    await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding/complete',
      headers: { Authorization: devToken('dev-test-oc2') },
    });

    const res2 = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding/complete',
      headers: { Authorization: devToken('dev-test-oc2') },
    });

    expect(res2.statusCode).toBe(200);
    expect(res2.json().pointsCredited).toBe(0);

    const wb = await prisma.pointsLedger.findMany({
      where: { userId: u.id, actionType: 'welcome_bonus' },
    });
    expect(wb).toHaveLength(1);
  });

  it('returns 401 without auth', async () => {
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding/complete',
    });
    expect(res.statusCode).toBe(401);
  });
});
