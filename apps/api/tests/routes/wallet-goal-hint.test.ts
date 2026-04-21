import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

// ---------------------------------------------------------------------------
// The PWA wallet shows two pieces of daily-goal copy: a "X / 250 pts" counter
// and a hint line ("105 pts to daily goal!" or "Daily goal hit 🎉"). Both
// derive from the same pointsToGoal = dailyGoal - dailyEarned math; the
// server owns the hint wording so we can tweak it without re-releasing mobile.
// ---------------------------------------------------------------------------
describe('GET /api/v1/wallet — daily goal hint', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('partial day: pointsToGoal + "N pts to daily goal!" hint', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wg1', phone: '+912000100001', username: 'wg1' });

    // Seed 100 points earned today
    await prisma.pointsLedger.create({
      data: {
        userId: u.id,
        actionType: 'like',
        points: 100,
        multiplierApplied: 1.0,
        expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { Authorization: devToken('dev-test-wg1') },
    });

    expect(res.statusCode).toBe(200);
    const wallet = res.json().wallet;
    expect(wallet.dailyGoal).toBe(250);
    expect(wallet.dailyEarned).toBe(100);
    expect(wallet.pointsToGoal).toBe(150);
    expect(wallet.dailyGoalHintCopy).toMatch(/150 pts to daily goal/i);
  });

  it('goal hit: pointsToGoal=0 + "Daily goal hit" hint', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wg2', phone: '+912000100002', username: 'wg2' });
    await prisma.pointsLedger.create({
      data: {
        userId: u.id,
        actionType: 'comment',
        points: 300, // > daily goal of 250
        multiplierApplied: 1.0,
        expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { Authorization: devToken('dev-test-wg2') },
    });

    const wallet = res.json().wallet;
    expect(wallet.pointsToGoal).toBe(0);
    expect(wallet.dailyGoalHintCopy).toMatch(/Daily goal hit/i);
  });

  it('cold start (no earning yet): pointsToGoal = dailyGoal', async () => {
    await seedUser({ firebaseUid: 'dev-test-wg3', phone: '+912000100003', username: 'wg3' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { Authorization: devToken('dev-test-wg3') },
    });
    const wallet = res.json().wallet;
    expect(wallet.pointsToGoal).toBe(250);
    expect(wallet.dailyGoalHintCopy).toMatch(/250 pts to daily goal/i);
  });
});
