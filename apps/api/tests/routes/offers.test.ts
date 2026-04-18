import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedOffer(overrides: Record<string, any> = {}) {
  return prisma.offer.create({
    data: {
      type: 'local',
      title: 'Sample offer',
      pointsCost: 200,
      cashValue: 50 as any,
      validFrom: new Date('2020-01-01'),
      validUntil: new Date('2030-01-01'),
      isActive: true,
      ...overrides,
    },
  });
}

describe('GET /api/v1/offers', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
  });

  it('returns all active offers grouped by type', async () => {
    await seedOffer({ type: 'local', title: 'Local A' });
    await seedOffer({ type: 'giftcard', title: 'Amazon' });
    await seedUser({ firebaseUid: 'dev-test-off1', phone: '+919500000001', username: 'toff1' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/offers',
      headers: { Authorization: devToken('dev-test-off1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.offers.length).toBe(2);
  });

  it('filters by type query param', async () => {
    await seedOffer({ type: 'local', title: 'Local A' });
    await seedOffer({ type: 'giftcard', title: 'Amazon' });
    await seedUser({ firebaseUid: 'dev-test-off2', phone: '+919500000002', username: 'toff2' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/offers?type=giftcard',
      headers: { Authorization: devToken('dev-test-off2') },
    });

    expect(res.json().offers).toHaveLength(1);
    expect(res.json().offers[0].type).toBe('giftcard');
  });

  it('excludes inactive offers', async () => {
    await seedOffer({ type: 'local', title: 'Active' });
    await seedOffer({ type: 'local', title: 'Inactive', isActive: false });
    await seedUser({ firebaseUid: 'dev-test-off3', phone: '+919500000003', username: 'toff3' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/offers',
      headers: { Authorization: devToken('dev-test-off3') },
    });

    const titles = res.json().offers.map((o: any) => o.title);
    expect(titles).toContain('Active');
    expect(titles).not.toContain('Inactive');
  });
});

describe('POST /api/v1/offers/:id/claim', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
    await closeTestApp();
  });

  it('claims the offer and returns the reward with claimCode', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-clm1', phone: '+919500000011', username: 'tclm1' });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ pointsCost: 100 });

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/offers/${offer.id}/claim`,
      headers: { Authorization: devToken('dev-test-clm1') },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().reward.claimCode).toMatch(/^ERU-/);
  });

  it('returns 400 when balance too low', async () => {
    await seedUser({ firebaseUid: 'dev-test-clm2', phone: '+919500000012', username: 'tclm2' });
    const offer = await seedOffer({ pointsCost: 999999 });
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/offers/${offer.id}/claim`,
      headers: { Authorization: devToken('dev-test-clm2') },
    });
    expect(res.statusCode).toBe(400);
  });
});
