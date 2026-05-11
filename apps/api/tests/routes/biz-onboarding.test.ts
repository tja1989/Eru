import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/biz/me', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
  }, 30_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
    await closeTestApp();
  }, 30_000);

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
});
