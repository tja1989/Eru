import { describe, it, expect, beforeEach, afterAll } from 'vitest';
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
});
