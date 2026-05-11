import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/biz/audience', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
  }, 60_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
    await closeTestApp();
  }, 60_000);

  it('returns 401 without a bearer token', async () => {
    const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/biz/audience' });
    expect(res.statusCode).toBe(401);
  });

  it('returns empty aggregates for an owner with no interactions', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bda1', phone: '+912000130001', username: 'bda1' });
    await prisma.business.create({
      data: { name: 'BD_TEST_Empty', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/audience',
      headers: { Authorization: devToken('dev-test-bda1') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ageBuckets).toEqual([]);
    expect(body.topPincodes).toEqual([]);
    expect(body.peakHours).toHaveLength(24);
    expect(body.peakHours.every((n: number) => n === 0)).toBe(true);
    expect(body.topInterests).toEqual([]);
  });

  it('aggregates demographics from users who interacted with the business\'s tagged content', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bda2', phone: '+912000130002', username: 'bda2' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_Aud', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });

    // Two interacting users with known dob, pincode, interests
    const u1 = await seedUser({ firebaseUid: 'dev-test-bda2a', phone: '+912000130012', username: 'bda2a' });
    const u2 = await seedUser({ firebaseUid: 'dev-test-bda2b', phone: '+912000130022', username: 'bda2b' });
    await prisma.user.update({
      where: { id: u1.id },
      data: { dob: new Date(2000, 5, 1), primaryPincode: '560001', interests: ['coffee', 'travel'] },
    });
    await prisma.user.update({
      where: { id: u2.id },
      data: { dob: new Date(1990, 0, 1), primaryPincode: '560001', interests: ['coffee'] },
    });

    const content = await prisma.content.create({
      data: {
        userId: u1.id, type: 'post', text: 'review',
        businessTagId: biz.id, moderationStatus: 'published', publishedAt: new Date(),
      },
    });
    await prisma.interaction.create({ data: { userId: u1.id, contentId: content.id, type: 'like' } });
    await prisma.interaction.create({ data: { userId: u2.id, contentId: content.id, type: 'like' } });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/audience',
      headers: { Authorization: devToken('dev-test-bda2') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Both interacting users are in 560001, so it should top the list
    const top = body.topPincodes.find((b: { label: string; count: number }) => b.label === '560001');
    expect(top?.count).toBe(2);
    // 'coffee' is in both users' interests
    const coffee = body.topInterests.find((b: { label: string }) => b.label === 'coffee');
    expect(coffee?.count).toBe(2);
    // Age buckets non-empty
    expect(body.ageBuckets.length).toBeGreaterThan(0);
    expect(body.ageBuckets.reduce((s: number, b: { count: number }) => s + b.count, 0)).toBe(2);
    // peakHours sum to 2 (one entry per interaction)
    expect(body.peakHours.reduce((s: number, n: number) => s + n, 0)).toBe(2);
  });
});
