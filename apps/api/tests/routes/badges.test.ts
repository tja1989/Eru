import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/badges', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.userBadge.deleteMany({});
    await prisma.badge.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.userBadge.deleteMany({});
    await prisma.badge.deleteMany({});
    await closeTestApp();
  });

  it('returns all badges with locked/unlocked status for the user', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-brd1', phone: '+911010000011', username: 'tbrd1' });
    await prisma.badge.create({
      data: { code: 'a', title: 'A', description: '', emoji: '🎯', unlockRule: { type: 'streak_days', threshold: 7 } },
    });
    await prisma.badge.create({
      data: { code: 'b', title: 'B', description: '', emoji: '⭐', unlockRule: { type: 'streak_days', threshold: 30 } },
    });
    await prisma.user.update({ where: { id: user.id }, data: { streakDays: 8 } });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/badges',
      headers: { Authorization: devToken('dev-test-brd1') },
    });

    const badges = res.json().badges;
    expect(badges).toHaveLength(2);
    const a = badges.find((x: any) => x.code === 'a');
    const b = badges.find((x: any) => x.code === 'b');
    expect(a.unlockedAt).toBeNull();
    expect(b.unlockedAt).toBeNull();

    // Trigger unlock
    await getTestApp().inject({
      method: 'POST', url: '/api/v1/badges/check',
      headers: { Authorization: devToken('dev-test-brd1') },
    });
    const res2 = await getTestApp().inject({
      method: 'GET', url: '/api/v1/badges',
      headers: { Authorization: devToken('dev-test-brd1') },
    });
    const badges2 = res2.json().badges;
    const a2 = badges2.find((x: any) => x.code === 'a');
    expect(a2.unlockedAt).not.toBeNull();
  });
});
