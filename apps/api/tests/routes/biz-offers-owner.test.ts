import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

const futureIso = (days: number) => new Date(Date.now() + days * 86400_000).toISOString();
const pastIso = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();

describe('/api/v1/biz/offers (owner-side)', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({ where: { title: { startsWith: 'BD_TEST_OFFER_' } } });
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
  }, 150_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({ where: { title: { startsWith: 'BD_TEST_OFFER_' } } });
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
    await closeTestApp();
  }, 150_000);

  it('GET 401 without a token', async () => {
    const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/biz/offers' });
    expect(res.statusCode).toBe(401);
  });

  it('GET 403 when caller does not own a business', async () => {
    await seedUser({ firebaseUid: 'dev-test-bdo1', phone: '+912000140001', username: 'bdo1' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/offers',
      headers: { Authorization: devToken('dev-test-bdo1') },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET returns only the caller business\'s offers, not other businesses', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdo2', phone: '+912000140002', username: 'bdo2' });
    const mineBiz = await prisma.business.create({
      data: { name: 'BD_TEST_Mine', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const otherOwner = await seedUser({ firebaseUid: 'dev-test-bdo2x', phone: '+912000140022', username: 'bdo2x' });
    const otherBiz = await prisma.business.create({
      data: { name: 'BD_TEST_Other', category: 'cafe', pincode: '682016', ownerId: otherOwner.id },
    });

    await prisma.offer.create({
      data: {
        type: 'local', businessId: mineBiz.id, title: 'BD_TEST_OFFER_Mine',
        pointsCost: 100, cashValue: 50, validFrom: new Date(), validUntil: new Date(Date.now() + 86400_000),
      },
    });
    await prisma.offer.create({
      data: {
        type: 'local', businessId: otherBiz.id, title: 'BD_TEST_OFFER_Other',
        pointsCost: 200, cashValue: 100, validFrom: new Date(), validUntil: new Date(Date.now() + 86400_000),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/offers',
      headers: { Authorization: devToken('dev-test-bdo2') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe('BD_TEST_OFFER_Mine');
  });

  it('POST creates an offer scoped to the caller\'s business', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdo3', phone: '+912000140003', username: 'bdo3' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_Create', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/offers',
      headers: { Authorization: devToken('dev-test-bdo3') },
      payload: {
        type: 'local', title: 'BD_TEST_OFFER_New', pointsCost: 50, cashValue: 25,
        validFrom: pastIso(1), validUntil: futureIso(30),
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('BD_TEST_OFFER_New');

    const saved = await prisma.offer.findUnique({ where: { id: body.id } });
    expect(saved?.businessId).toBe(biz.id);
  });

  it('POST 400 on invalid payload', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdo4', phone: '+912000140004', username: 'bdo4' });
    await prisma.business.create({
      data: { name: 'BD_TEST_Bad', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/offers',
      headers: { Authorization: devToken('dev-test-bdo4') },
      payload: { type: 'local' }, // missing title, points, cashValue, dates
    });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH updates only the caller\'s own offer', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdo5', phone: '+912000140005', username: 'bdo5' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_Patch', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const offer = await prisma.offer.create({
      data: {
        type: 'local', businessId: biz.id, title: 'BD_TEST_OFFER_Old',
        pointsCost: 100, cashValue: 50, validFrom: new Date(), validUntil: new Date(Date.now() + 86400_000),
      },
    });

    const res = await getTestApp().inject({
      method: 'PATCH',
      url: `/api/v1/biz/offers/${offer.id}`,
      headers: { Authorization: devToken('dev-test-bdo5') },
      payload: { title: 'BD_TEST_OFFER_New', isActive: false },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('BD_TEST_OFFER_New');
    expect(body.isActive).toBe(false);
  });

  it('PATCH 404 on another business\'s offer', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdo6', phone: '+912000140006', username: 'bdo6' });
    await prisma.business.create({
      data: { name: 'BD_TEST_Caller', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const otherOwner = await seedUser({ firebaseUid: 'dev-test-bdo6x', phone: '+912000140026', username: 'bdo6x' });
    const otherBiz = await prisma.business.create({
      data: { name: 'BD_TEST_Other2', category: 'cafe', pincode: '682016', ownerId: otherOwner.id },
    });
    const offer = await prisma.offer.create({
      data: {
        type: 'local', businessId: otherBiz.id, title: 'BD_TEST_OFFER_NotMine',
        pointsCost: 100, cashValue: 50, validFrom: new Date(), validUntil: new Date(Date.now() + 86400_000),
      },
    });
    const res = await getTestApp().inject({
      method: 'PATCH',
      url: `/api/v1/biz/offers/${offer.id}`,
      headers: { Authorization: devToken('dev-test-bdo6') },
      payload: { title: 'BD_TEST_OFFER_HackAttempt' },
    });
    expect(res.statusCode).toBe(404);
  });
});
