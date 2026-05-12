import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('/api/v1/biz plans + billing (B6.3)', () => {
  beforeAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_BILL_' } } });
  }, 180_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_BILL_' } } });
    await closeTestApp();
  }, 180_000);

  it('GET /biz/plans 401 without a token', async () => {
    const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/biz/plans' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /biz/plans returns the tier catalog for any authed user', async () => {
    await seedUser({ firebaseUid: 'dev-test-bdbill1', phone: '+912000170001', username: 'bdbill1' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/plans',
      headers: { Authorization: devToken('dev-test-bdbill1') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.tiers)).toBe(true);
    expect(body.tiers).toHaveLength(3);
    const tiers = body.tiers.map((t: { tier: string }) => t.tier).sort();
    expect(tiers).toEqual(['growth', 'pro', 'starter']);
    const growth = body.tiers.find((t: { tier: string }) => t.tier === 'growth');
    expect(growth.monthlyCapAmount).toBe(5000);
    expect(growth.pincodeCap).toBe(5);
    expect(Array.isArray(growth.features)).toBe(true);
  });

  it('GET /biz/billing 403 when the caller has no owned business', async () => {
    await seedUser({ firebaseUid: 'dev-test-bdbill2', phone: '+912000170002', username: 'bdbill2' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/billing',
      headers: { Authorization: devToken('dev-test-bdbill2') },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /biz/billing returns current plan + transactions for the owner\'s business', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdbill3', phone: '+912000170003', username: 'bdbill3' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_BILL_Active', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    await prisma.businessPlan.create({
      data: { businessId: biz.id, tier: 'growth', monthlyCapAmount: 5000, pincodeCap: 5 },
    });
    await prisma.businessTransaction.create({
      data: { businessId: biz.id, amount: 1500, kind: 'topup' },
    });
    await prisma.businessTransaction.create({
      data: { businessId: biz.id, amount: -250, kind: 'campaign_debit' },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/billing',
      headers: { Authorization: devToken('dev-test-bdbill3') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.currentTier).toBe('growth');
    expect(body.monthlyCapAmount).toBe(5000);
    expect(body.spentThisMonth).toBe(250);
    // remaining: balance = 1500 - 250 = 1250
    expect(body.remaining).toBe(1250);
    expect(body.transactions).toHaveLength(2);
    // Sorted desc by createdAt — the campaign_debit was inserted second
    expect(body.transactions[0].kind).toBe('campaign_debit');
    expect(body.transactions[0].amount).toBe(-250);
    expect(body.transactions[1].kind).toBe('topup');
    expect(body.transactions[1].amount).toBe(1500);
  });

  it('GET /biz/billing returns currentTier:null when no plan is set yet', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdbill4', phone: '+912000170004', username: 'bdbill4' });
    await prisma.business.create({
      data: { name: 'BD_TEST_BILL_NoPlan', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/billing',
      headers: { Authorization: devToken('dev-test-bdbill4') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.currentTier).toBeNull();
    expect(body.monthlyCapAmount).toBe(0);
    expect(body.spentThisMonth).toBe(0);
    expect(body.remaining).toBe(0);
    expect(body.transactions).toEqual([]);
  });
});
