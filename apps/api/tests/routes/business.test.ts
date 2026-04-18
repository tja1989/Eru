import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedBiz(overrides = {}) {
  return prisma.business.create({
    data: {
      name: 'Kashi Bakes',
      category: 'Bakery',
      pincode: '682016',
      isVerified: true,
      rating: 4.7 as any,
      reviewCount: 287,
      ...overrides,
    },
  });
}

describe('GET /api/v1/business/:id', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
    await prisma.business.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns business profile with rating + review count', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bz1', phone: '+911100000001', username: 'tbz1' });
    const biz = await seedBiz();
    const res = await getTestApp().inject({
      method: 'GET', url: `/api/v1/business/${biz.id}`,
      headers: { Authorization: devToken('dev-test-bz1') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().business.name).toBe('Kashi Bakes');
    expect(res.json().business.rating).toBe('4.7');
  });

  it('includes active offers in the response', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bz2', phone: '+911100000002', username: 'tbz2' });
    const biz = await seedBiz();
    await prisma.offer.create({
      data: {
        type: 'local', businessId: biz.id, title: '20% off', pointsCost: 200,
        cashValue: 50 as any, validFrom: new Date('2020-01-01'), validUntil: new Date('2030-01-01'),
      },
    });
    const res = await getTestApp().inject({
      method: 'GET', url: `/api/v1/business/${biz.id}`,
      headers: { Authorization: devToken('dev-test-bz2') },
    });
    expect(res.json().business.offers).toHaveLength(1);
    expect(res.json().business.offers[0].title).toBe('20% off');
  });

  it('returns 404 for unknown id', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bz3', phone: '+911100000003', username: 'tbz3' });
    const res = await getTestApp().inject({
      method: 'GET', url: `/api/v1/business/00000000-0000-0000-0000-000000000000`,
      headers: { Authorization: devToken('dev-test-bz3') },
    });
    expect(res.statusCode).toBe(404);
  });
});
