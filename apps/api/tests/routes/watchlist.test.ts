import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedBiz(overrides = {}) {
  return prisma.business.create({
    data: { name: 'Brew District', category: 'cafe', pincode: '682001', ...overrides },
  });
}

describe('POST /api/v1/watchlist', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
    await closeTestApp();
  });

  it('adds a business and returns the shaped entry', async () => {
    await seedUser({ firebaseUid: 'dev-test-wlr1', phone: '+912000020001', username: 'wlr1' });
    const biz = await seedBiz({ name: 'Brew District' });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/watchlist',
      headers: { Authorization: devToken('dev-test-wlr1') },
      payload: { businessId: biz.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.entry.businessName).toBe('Brew District');
    expect(body.entry.notifyOnOffers).toBe(true);
  });

  it('rejects unknown businessId with 404', async () => {
    await seedUser({ firebaseUid: 'dev-test-wlr2', phone: '+912000020002', username: 'wlr2' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/watchlist',
      headers: { Authorization: devToken('dev-test-wlr2') },
      payload: { businessId: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects 400 on invalid body', async () => {
    await seedUser({ firebaseUid: 'dev-test-wlr2b', phone: '+912000020007', username: 'wlr2b' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/watchlist',
      headers: { Authorization: devToken('dev-test-wlr2b') },
      payload: { businessId: 'not-a-uuid' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/v1/watchlist', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });

  it('lists the current user watched businesses, newest first', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wlr3', phone: '+912000020003', username: 'wlr3' });
    const b1 = await seedBiz({ name: 'A', pincode: '682001' });
    const b2 = await seedBiz({ name: 'B', pincode: '682001' });
    await prisma.watchlist.createMany({
      data: [
        { userId: user.id, businessId: b1.id },
        { userId: user.id, businessId: b2.id },
      ],
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/watchlist',
      headers: { Authorization: devToken('dev-test-wlr3') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(2);
    expect(res.json().items).toHaveLength(2);
  });
});

describe('DELETE /api/v1/watchlist/:businessId', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });

  it('removes a business and returns 204', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wlr4', phone: '+912000020004', username: 'wlr4' });
    const biz = await seedBiz({ name: 'X', pincode: '682001' });
    await prisma.watchlist.create({ data: { userId: user.id, businessId: biz.id } });

    const res = await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/watchlist/${biz.id}`,
      headers: { Authorization: devToken('dev-test-wlr4') },
    });
    expect(res.statusCode).toBe(204);
    const remaining = await prisma.watchlist.findMany({ where: { userId: user.id } });
    expect(remaining).toHaveLength(0);
  });

  it('404 when trying to delete a non-existent watchlist entry', async () => {
    await seedUser({ firebaseUid: 'dev-test-wlr5', phone: '+912000020005', username: 'wlr5' });
    const biz = await seedBiz({ name: 'Y', pincode: '682001' });
    const res = await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/watchlist/${biz.id}`,
      headers: { Authorization: devToken('dev-test-wlr5') },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/v1/watchlist/:businessId', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });

  it('toggles notifyOnOffers', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wlr6', phone: '+912000020006', username: 'wlr6' });
    const biz = await seedBiz({ name: 'Z', pincode: '682001' });
    await prisma.watchlist.create({ data: { userId: user.id, businessId: biz.id } });

    const res = await getTestApp().inject({
      method: 'PATCH',
      url: `/api/v1/watchlist/${biz.id}`,
      headers: { Authorization: devToken('dev-test-wlr6') },
      payload: { notifyOnOffers: false },
    });
    expect(res.statusCode).toBe(200);
    const updated = await prisma.watchlist.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: biz.id } },
    });
    expect(updated?.notifyOnOffers).toBe(false);
  });
});
