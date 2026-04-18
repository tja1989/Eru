import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/reels?tab=...', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('tab=following returns reels only from users I follow', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-rt1', phone: '+911500000001', username: 'trt1' });
    const f = await seedUser({ firebaseUid: 'dev-test-rt2', phone: '+911500000002', username: 'trt2' });
    const o = await seedUser({ firebaseUid: 'dev-test-rt3', phone: '+911500000003', username: 'trt3' });
    await prisma.follow.create({ data: { followerId: me.id, followingId: f.id } });
    await prisma.content.create({
      data: { userId: f.id, type: 'reel', moderationStatus: 'published', publishedAt: new Date() },
    });
    await prisma.content.create({
      data: { userId: o.id, type: 'reel', moderationStatus: 'published', publishedAt: new Date() },
    });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/reels?tab=following',
      headers: { Authorization: devToken('dev-test-rt1') },
    });
    const reels = res.json().data ?? res.json().reels ?? [];
    const userIds = reels.map((r: any) => r.userId);
    expect(userIds).toContain(f.id);
    expect(userIds).not.toContain(o.id);
  });

  it('tab=local returns reels from users in my pincode', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-rt4', phone: '+911500000004', username: 'trt4' });
    await prisma.user.update({ where: { id: me.id }, data: { primaryPincode: '682016' } });
    const local = await seedUser({ firebaseUid: 'dev-test-rt5', phone: '+911500000005', username: 'trt5' });
    await prisma.user.update({ where: { id: local.id }, data: { primaryPincode: '682016' } });
    const distant = await seedUser({ firebaseUid: 'dev-test-rt6', phone: '+911500000006', username: 'trt6' });
    await prisma.user.update({ where: { id: distant.id }, data: { primaryPincode: '600001' } });

    await prisma.content.create({
      data: { userId: local.id, type: 'reel', moderationStatus: 'published', publishedAt: new Date(), locationPincode: '682016' },
    });
    await prisma.content.create({
      data: { userId: distant.id, type: 'reel', moderationStatus: 'published', publishedAt: new Date(), locationPincode: '600001' },
    });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/reels?tab=local',
      headers: { Authorization: devToken('dev-test-rt4') },
    });
    const reels = res.json().data ?? res.json().reels ?? [];
    expect(reels.find((r: any) => r.userId === local.id)).toBeDefined();
    expect(reels.find((r: any) => r.userId === distant.id)).toBeUndefined();
  });
});
