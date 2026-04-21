import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

// ---------------------------------------------------------------------------
// GET /watchlist/deals — live offers from businesses the user follows.
// Drives the Watchlist tab on My Rewards: tell me what's new at stores I
// care about, ordered newest-first.
// ---------------------------------------------------------------------------
describe('GET /api/v1/watchlist/deals', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({ where: { title: { startsWith: 'TEST_' } } });
    await prisma.business.deleteMany({ where: { name: { startsWith: 'TEST_' } } });
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({ where: { title: { startsWith: 'TEST_' } } });
    await prisma.business.deleteMany({ where: { name: { startsWith: 'TEST_' } } });
    await closeTestApp();
  });

  it('returns active offers from watched businesses (not un-watched ones)', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wd1', phone: '+912000110001', username: 'wd1' });
    const b1 = await prisma.business.create({ data: { name: 'TEST_Kashi', category: 'bakery', pincode: '682016' } });
    const b2 = await prisma.business.create({ data: { name: 'TEST_Brew', category: 'cafe', pincode: '682001' } });
    const b3 = await prisma.business.create({ data: { name: 'TEST_Skipped', category: 'other', pincode: '682001' } });
    await prisma.watchlist.createMany({
      data: [
        { userId: u.id, businessId: b1.id },
        { userId: u.id, businessId: b2.id },
      ],
    });
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.offer.createMany({
      data: [
        { businessId: b1.id, title: 'TEST_Kashi Deal', type: 'local', pointsCost: 200, cashValue: 50, validFrom: new Date(), validUntil: future, isActive: true },
        { businessId: b2.id, title: 'TEST_Brew Deal', type: 'local', pointsCost: 150, cashValue: 30, validFrom: new Date(), validUntil: future, isActive: true },
        { businessId: b3.id, title: 'TEST_Skipped Deal', type: 'local', pointsCost: 100, cashValue: 20, validFrom: new Date(), validUntil: future, isActive: true },
      ],
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/watchlist/deals',
      headers: { Authorization: devToken('dev-test-wd1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(2);
    const titles = body.items.map((i: { title: string }) => i.title).sort();
    expect(titles).toEqual(['TEST_Brew Deal', 'TEST_Kashi Deal']);
  });

  it('each deal item includes business metadata + offer fields', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wd2', phone: '+912000110002', username: 'wd2' });
    const b = await prisma.business.create({
      data: { name: 'TEST_Shape', category: 'bakery', pincode: '682016', avatarUrl: 'https://example.com/s.jpg' },
    });
    await prisma.watchlist.create({ data: { userId: u.id, businessId: b.id } });
    await prisma.offer.create({
      data: {
        businessId: b.id,
        title: 'TEST_Shape Deal',
        type: 'local',
        pointsCost: 200,
        cashValue: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86_400_000),
        isActive: true,
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/watchlist/deals',
      headers: { Authorization: devToken('dev-test-wd2') },
    });
    const item = res.json().items[0];
    expect(item).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'TEST_Shape Deal',
        pointsCost: 200,
        businessId: b.id,
        businessName: 'TEST_Shape',
        businessCategory: 'bakery',
        businessAvatarUrl: 'https://example.com/s.jpg',
      }),
    );
    expect(typeof item.expiresAt).toBe('string');
  });

  it('excludes expired + inactive offers', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wd3', phone: '+912000110003', username: 'wd3' });
    const b = await prisma.business.create({ data: { name: 'TEST_Ex', category: 'cafe', pincode: '682001' } });
    await prisma.watchlist.create({ data: { userId: u.id, businessId: b.id } });
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    await prisma.offer.createMany({
      data: [
        { businessId: b.id, title: 'TEST_Expired', type: 'local', pointsCost: 100, cashValue: 20, validFrom: past, validUntil: past, isActive: true },
        { businessId: b.id, title: 'TEST_Inactive', type: 'local', pointsCost: 100, cashValue: 20, validFrom: past, validUntil: future, isActive: false },
        { businessId: b.id, title: 'TEST_Active', type: 'local', pointsCost: 100, cashValue: 20, validFrom: past, validUntil: future, isActive: true },
      ],
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/watchlist/deals',
      headers: { Authorization: devToken('dev-test-wd3') },
    });
    const titles = res.json().items.map((i: { title: string }) => i.title);
    expect(titles).toEqual(['TEST_Active']);
  });

  it('returns 401 without auth', async () => {
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/watchlist/deals',
    });
    expect(res.statusCode).toBe(401);
  });
});
