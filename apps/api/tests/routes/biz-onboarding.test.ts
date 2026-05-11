import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/biz/me', () => {
  beforeAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
  }, 180_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
    await closeTestApp();
  }, 180_000);

  it('returns business: null when the caller has no owned business', async () => {
    await seedUser({ firebaseUid: 'dev-test-bzme1', phone: '+912000080001', username: 'bzme1' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/me',
      headers: { Authorization: devToken('dev-test-bzme1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual({ business: null });
  });

  it('returns the owned business when the caller owns one', async () => {
    const owner = await seedUser({
      firebaseUid: 'dev-test-bzme2',
      phone: '+912000080002',
      username: 'bzme2',
    });
    const biz = await prisma.business.create({
      data: {
        name: 'BD_TEST_Owned Cafe',
        category: 'cafe',
        pincode: '682016',
        ownerId: owner.id,
        targetPincodes: ['682016', '682020'],
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/me',
      headers: { Authorization: devToken('dev-test-bzme2') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.business).not.toBeNull();
    expect(body.business.id).toBe(biz.id);
    expect(body.business.name).toBe('BD_TEST_Owned Cafe');
    expect(body.business.category).toBe('cafe');
    expect(body.business.pincode).toBe('682016');
    expect(body.business.targetPincodes).toEqual(['682016', '682020']);
    expect(typeof body.business.followerCount).toBe('number');
    expect(typeof body.business.rating).toBe('number');
    expect(typeof body.business.reviewCount).toBe('number');
    expect(typeof body.business.isVerified).toBe('boolean');
  });

  it('returns 401 without a bearer token', async () => {
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/me',
    });
    expect(res.statusCode).toBe(401);
  });

  // ---------- B6.1: onboarding endpoints ----------

  it('POST /onboarding/setup creates a Business for a user with no existing one', async () => {
    await seedUser({ firebaseUid: 'dev-test-bzob1', phone: '+912000160001', username: 'bzob1' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/setup',
      headers: { Authorization: devToken('dev-test-bzob1') },
      payload: { name: 'BD_TEST_OB Biz', category: 'cafe', pincode: '682016', address: '123', phone: '+912000160001' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.business.name).toBe('BD_TEST_OB Biz');
    expect(body.business.pincode).toBe('682016');
  });

  it('POST /onboarding/setup updates an existing owned Business', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bzob2', phone: '+912000160002', username: 'bzob2' });
    await prisma.business.create({
      data: { name: 'BD_TEST_OB Old', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/setup',
      headers: { Authorization: devToken('dev-test-bzob2') },
      payload: { name: 'BD_TEST_OB New', category: 'restaurant', pincode: '682020' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().business.name).toBe('BD_TEST_OB New');
    expect(res.json().business.category).toBe('restaurant');
  });

  it('POST /onboarding/setup 401 without a token', async () => {
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/setup',
      payload: { name: 'X', category: 'cafe', pincode: '682016' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /onboarding/pincodes persists targetPincodes', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bzob3', phone: '+912000160003', username: 'bzob3' });
    await prisma.business.create({
      data: { name: 'BD_TEST_OB Pin', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/pincodes',
      headers: { Authorization: devToken('dev-test-bzob3') },
      payload: { pincodes: ['682016', '682020', '560001'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().business.targetPincodes).toEqual(['682016', '682020', '560001']);
  });

  it('POST /onboarding/pincodes 403 when no business exists', async () => {
    await seedUser({ firebaseUid: 'dev-test-bzob4', phone: '+912000160004', username: 'bzob4' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/pincodes',
      headers: { Authorization: devToken('dev-test-bzob4') },
      payload: { pincodes: ['682016'] },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST /onboarding/plan upserts a BusinessPlan', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bzob5', phone: '+912000160005', username: 'bzob5' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_OB Plan', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/plan',
      headers: { Authorization: devToken('dev-test-bzob5') },
      payload: { tier: 'growth' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tier).toBe('growth');
    expect(body.monthlyCapAmount).toBe(5000);
    expect(body.pincodeCap).toBe(5);

    const saved = await prisma.businessPlan.findUnique({ where: { businessId: biz.id } });
    expect(saved?.tier).toBe('growth');
  });

  it('POST /onboarding/plan 403 when no business exists', async () => {
    await seedUser({ firebaseUid: 'dev-test-bzob6', phone: '+912000160006', username: 'bzob6' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/plan',
      headers: { Authorization: devToken('dev-test-bzob6') },
      payload: { tier: 'starter' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST /onboarding/payment writes a mock topup and reports new balance', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bzob7', phone: '+912000160007', username: 'bzob7' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_OB Pay', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/payment',
      headers: { Authorization: devToken('dev-test-bzob7') },
      payload: { amount: 1500 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.amount).toBe(1500);
    expect(body.newBalance).toBe(1500);

    const txs = await prisma.businessTransaction.findMany({ where: { businessId: biz.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].kind).toBe('topup');
  });

  it('POST /onboarding/payment 400 on non-positive amount', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bzob8', phone: '+912000160008', username: 'bzob8' });
    await prisma.business.create({
      data: { name: 'BD_TEST_OB Pay2', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/onboarding/payment',
      headers: { Authorization: devToken('dev-test-bzob8') },
      payload: { amount: 0 },
    });
    expect(res.statusCode).toBe(400);
  });
});
