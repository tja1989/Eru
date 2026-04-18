import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/leaderboard?scope=friends', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns only users I follow, ranked by weekly PointsLedger sum', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-lb1', phone: '+911600000001', username: 'tlb1' });
    const f = await seedUser({ firebaseUid: 'dev-test-lb2', phone: '+911600000002', username: 'tlb2' });
    const o = await seedUser({ firebaseUid: 'dev-test-lb3', phone: '+911600000003', username: 'tlb3' });
    await prisma.follow.create({ data: { followerId: me.id, followingId: f.id } });

    const now = new Date();
    const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.pointsLedger.create({
      data: { userId: f.id, actionType: 'like', points: 500, multiplierApplied: 1 as any, expiresAt: in30d, createdAt: now },
    });
    await prisma.pointsLedger.create({
      data: { userId: o.id, actionType: 'like', points: 1000, multiplierApplied: 1 as any, expiresAt: in30d, createdAt: now },
    });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/leaderboard?scope=friends',
      headers: { Authorization: devToken('dev-test-lb1') },
    });
    expect(res.statusCode).toBe(200);
    const rankings = res.json().rankings;
    const ids = rankings.map((r: any) => r.id);
    expect(ids).toContain(f.id);
    expect(ids).not.toContain(o.id);
  });

  it('creatorScore is returned as a number (not a Prisma Decimal string)', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-lbcs1', phone: '+911600000011', username: 'tlbcs1' });
    const friend = await seedUser({ firebaseUid: 'dev-test-lbcs2', phone: '+911600000012', username: 'tlbcs2' });
    await prisma.user.update({
      where: { id: friend.id },
      data: { creatorScore: new Prisma.Decimal('75.50') },
    });
    await prisma.follow.create({ data: { followerId: me.id, followingId: friend.id } });

    const now = new Date();
    const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.pointsLedger.create({
      data: { userId: friend.id, actionType: 'like', points: 100, multiplierApplied: 1 as any, expiresAt: in30d, createdAt: now },
    });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/leaderboard?scope=friends',
      headers: { Authorization: devToken('dev-test-lbcs1') },
    });
    expect(res.statusCode).toBe(200);
    const rankings = res.json().rankings;
    const entry = rankings.find((r: any) => r.id === friend.id);
    expect(entry).toBeDefined();
    // Must be a JS number, not a string like "75.50"
    expect(typeof entry.creatorScore).toBe('number');
    expect(entry.creatorScore).toBe(75.5);
  });
});
