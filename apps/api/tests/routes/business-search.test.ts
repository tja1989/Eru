import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/businesses/search', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'TEST_' } } });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'TEST_' } } });
    await closeTestApp();
  });

  it('returns fuzzy case-insensitive matches on name', async () => {
    await seedUser({ firebaseUid: 'dev-test-bs1', phone: '+912000070001', username: 'bs1' });
    await prisma.business.createMany({
      data: [
        { name: 'TEST_Kashi Bakes', category: 'bakery', pincode: '682016' },
        { name: 'TEST_Kashi Kitchen', category: 'cafe', pincode: '682001' },
        { name: 'TEST_Brew District', category: 'cafe', pincode: '682001' },
      ],
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/businesses/search?q=kashi',
      headers: { Authorization: devToken('dev-test-bs1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBe(2);
    const names = body.items.map((i: { name: string }) => i.name).sort();
    expect(names).toEqual(['TEST_Kashi Bakes', 'TEST_Kashi Kitchen']);
  });

  it('each item has {id, name, category, pincode, avatarUrl}', async () => {
    await seedUser({ firebaseUid: 'dev-test-bs2', phone: '+912000070002', username: 'bs2' });
    await prisma.business.create({
      data: { name: 'TEST_Sunrise Mart', category: 'grocery', pincode: '682020', avatarUrl: 'https://example.com/s.jpg' },
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/businesses/search?q=sunrise',
      headers: { Authorization: devToken('dev-test-bs2') },
    });
    const item = res.json().items[0];
    expect(item).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'TEST_Sunrise Mart',
        category: 'grocery',
        pincode: '682020',
        avatarUrl: 'https://example.com/s.jpg',
      }),
    );
  });

  it('returns 400 when q is missing or empty', async () => {
    await seedUser({ firebaseUid: 'dev-test-bs3', phone: '+912000070003', username: 'bs3' });
    const res1 = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/businesses/search',
      headers: { Authorization: devToken('dev-test-bs3') },
    });
    expect(res1.statusCode).toBe(400);

    const res2 = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/businesses/search?q=',
      headers: { Authorization: devToken('dev-test-bs3') },
    });
    expect(res2.statusCode).toBe(400);
  });

  it('caps the result set at 10 entries', async () => {
    await seedUser({ firebaseUid: 'dev-test-bs4', phone: '+912000070004', username: 'bs4' });
    const rows = Array.from({ length: 15 }).map((_, i) => ({
      name: `TEST_ZebraCafe ${i + 1}`,
      category: 'cafe',
      pincode: '682001',
    }));
    await prisma.business.createMany({ data: rows });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/businesses/search?q=ZebraCafe',
      headers: { Authorization: devToken('dev-test-bs4') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.length).toBe(10);
  });

  it('returns 401 without auth', async () => {
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/businesses/search?q=anything',
    });
    expect(res.statusCode).toBe(401);
  });
});
