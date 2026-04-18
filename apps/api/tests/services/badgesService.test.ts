import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { badgesService } from '../../src/services/badgesService.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

describe('badgesService.checkAndUnlock', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.badge.deleteMany({});
    await prisma.userBadge.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.badge.deleteMany({});
    await prisma.userBadge.deleteMany({});
  });

  it('unlocks streak_7 when user streak reaches 7', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bd1', phone: '+911010000001', username: 'tbd1' });
    await prisma.badge.create({
      data: {
        code: 'streak_7', title: '7', description: '', emoji: '🔥',
        unlockRule: { type: 'streak_days', threshold: 7 },
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { streakDays: 7 } });

    await badgesService.checkAndUnlock(user.id);

    const ub = await prisma.userBadge.findFirst({
      where: { userId: user.id, badge: { code: 'streak_7' } },
    });
    expect(ub).not.toBeNull();
  });

  it('does not double-unlock', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bd2', phone: '+911010000002', username: 'tbd2' });
    const badge = await prisma.badge.create({
      data: {
        code: 'streak_7', title: '7', description: '', emoji: '🔥',
        unlockRule: { type: 'streak_days', threshold: 7 },
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { streakDays: 10 } });

    await badgesService.checkAndUnlock(user.id);
    await badgesService.checkAndUnlock(user.id);

    const count = await prisma.userBadge.count({ where: { userId: user.id, badgeId: badge.id } });
    expect(count).toBe(1);
  });

  it('unlocks first_purchase after a reward is claimed', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bd3', phone: '+911010000003', username: 'tbd3' });
    await prisma.badge.create({
      data: {
        code: 'first_purchase', title: '1st', description: '', emoji: '🛍️',
        unlockRule: { type: 'rewards_claimed', threshold: 1 },
      },
    });
    const offer = await prisma.offer.create({
      data: {
        type: 'local', title: 'X', pointsCost: 10, cashValue: 1 as any,
        validFrom: new Date('2020-01-01'), validUntil: new Date('2030-01-01'),
      },
    });
    await prisma.userReward.create({
      data: { userId: user.id, offerId: offer.id, claimCode: 'A', pointsSpent: 10, expiresAt: new Date('2030-01-01') },
    });

    await badgesService.checkAndUnlock(user.id);

    const ub = await prisma.userBadge.findFirst({
      where: { userId: user.id, badge: { code: 'first_purchase' } },
    });
    expect(ub).not.toBeNull();
  });
});
