import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

// ---------------------------------------------------------------------------
// POST /rewards/recharge creates a placeholder UserReward (no 3rd-party
// integration yet) and debits the user's balance atomically. The UI completes
// end-to-end; operations fulfilment is a separate workstream (Paytm/Ezetap).
// ---------------------------------------------------------------------------
describe('POST /api/v1/rewards/recharge', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  async function seedWithBalance(uid: string, balance: number) {
    const u = await seedUser({ firebaseUid: uid, phone: `+9129000000${uid.length}${balance % 10}`, username: uid.slice(-10) });
    await prisma.user.update({ where: { id: u.id }, data: { currentBalance: balance, lifetimePoints: balance } });
    return u;
  }

  it('deducts points and creates a pending UserReward for a valid plan', async () => {
    const u = await seedWithBalance('dev-test-rc1', 5000);
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/rewards/recharge',
      headers: { Authorization: devToken('dev-test-rc1') },
      payload: { planId: 'jio_239', phone: '+919876543210' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.reward).toBeDefined();
    expect(body.reward.status).toBe('active'); // placeholder acts like any other active reward
    expect(body.newBalance).toBe(5000 - 2390);

    const refreshed = await prisma.user.findUnique({ where: { id: u.id } });
    expect(refreshed?.currentBalance).toBe(5000 - 2390);
  });

  it('returns 402 when insufficient balance', async () => {
    await seedWithBalance('dev-test-rc2', 100);
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/rewards/recharge',
      headers: { Authorization: devToken('dev-test-rc2') },
      payload: { planId: 'jio_239', phone: '+919876543210' },
    });
    expect(res.statusCode).toBe(402);
  });

  it('returns 400 for an unknown plan', async () => {
    await seedWithBalance('dev-test-rc3', 5000);
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/rewards/recharge',
      headers: { Authorization: devToken('dev-test-rc3') },
      payload: { planId: 'not_a_plan', phone: '+919876543210' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for an invalid phone format', async () => {
    await seedWithBalance('dev-test-rc4', 5000);
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/rewards/recharge',
      headers: { Authorization: devToken('dev-test-rc4') },
      payload: { planId: 'jio_239', phone: 'not-a-phone' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('writes a negative PointsLedger row matching the plan cost', async () => {
    const u = await seedWithBalance('dev-test-rc5', 5000);
    await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/rewards/recharge',
      headers: { Authorization: devToken('dev-test-rc5') },
      payload: { planId: 'jio_149', phone: '+919876543210' },
    });
    const ledger = await prisma.pointsLedger.findMany({ where: { userId: u.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].points).toBe(-1490);
  });

  it('returns 401 without auth', async () => {
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/rewards/recharge',
      payload: { planId: 'jio_149', phone: '+919876543210' },
    });
    expect(res.statusCode).toBe(401);
  });
});
