import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function cleanupWalletTierData() {
  // cleanupTestData from db.ts doesn't touch pointsLedger, and our expiry test
  // writes a ledger row — remove it first so the user cascade-delete below
  // doesn't trip the FK constraint.
  await prisma.pointsLedger.deleteMany({
    where: { user: { firebaseUid: { startsWith: 'dev-test-' } } },
  });
  await cleanupTestData();
}

describe('GET /api/v1/wallet — tier + expiry', () => {
  beforeEach(cleanupWalletTierData);
  afterAll(async () => {
    await cleanupWalletTierData();
    await closeTestApp();
  });

  it('returns tier progress (currentTier, nextTier, pointsToNext)', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-wt1',
      phone: '+919700000001',
      username: 'twt1',
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { lifetimePoints: 8000, currentBalance: 2000, tier: 'engager' },
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { Authorization: devToken('dev-test-wt1') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.wallet.currentTier).toBe('engager');
    expect(body.wallet.nextTier).toBe('influencer');
    expect(body.wallet.pointsToNext).toBe(2000);
  });

  it('returns expiringPoints and expiringDays when ledger entries expire soon', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-wt2',
      phone: '+919700000002',
      username: 'twt2',
    });
    await prisma.pointsLedger.create({
      data: {
        userId: user.id,
        actionType: 'like',
        points: 100,
        multiplierApplied: 1.0 as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { Authorization: devToken('dev-test-wt2') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.wallet.expiringPoints).toBe(100);
    expect(body.wallet.expiringDays).toBeLessThanOrEqual(8);
    expect(body.wallet.expiringDays).toBeGreaterThanOrEqual(6);
  });
});
