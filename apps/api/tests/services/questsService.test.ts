import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { questsService } from '../../src/services/questsService.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

describe('questsService.getWeeklyProgress', () => {
  beforeEach(async () => {
    await prisma.userQuestProgress.deleteMany({});
    await prisma.quest.deleteMany({});
    await prisma.pointsLedger.deleteMany({
      where: { user: { firebaseUid: { startsWith: 'dev-test-' } } },
    });
    await cleanupTestData();
  });
  afterAll(async () => {
    await prisma.userQuestProgress.deleteMany({});
    await prisma.quest.deleteMany({});
    await prisma.pointsLedger.deleteMany({
      where: { user: { firebaseUid: { startsWith: 'dev-test-' } } },
    });
    await cleanupTestData();
  });

  it('returns all active weekly quests with current progress=0 if none', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-q1',
      phone: '+919900000001',
      username: 'tq1',
    });
    await prisma.quest.create({
      data: {
        id: 'qa',
        title: 'Read 5',
        actionType: 'read_article',
        targetCount: 5,
        rewardPoints: 25,
        period: 'weekly',
      },
    });

    const result = await questsService.getWeeklyProgress(user.id);
    expect(result).toHaveLength(1);
    expect(result[0].currentCount).toBe(0);
    expect(result[0].completed).toBe(false);
  });

  it('counts matching action types in PointsLedger within the current week', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-q2',
      phone: '+919900000002',
      username: 'tq2',
    });
    await prisma.quest.create({
      data: {
        id: 'qb',
        title: 'Read 5',
        actionType: 'read_article',
        targetCount: 5,
        rewardPoints: 25,
        period: 'weekly',
      },
    });
    for (let i = 0; i < 3; i++) {
      await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          actionType: 'read_article',
          points: 4,
          multiplierApplied: 1.0 as any,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const result = await questsService.getWeeklyProgress(user.id);
    expect(result[0].currentCount).toBe(3);
  });

  it('marks as completed when currentCount >= targetCount', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-q3',
      phone: '+919900000003',
      username: 'tq3',
    });
    await prisma.quest.create({
      data: {
        id: 'qc',
        title: 'Share 3',
        actionType: 'share',
        targetCount: 3,
        rewardPoints: 30,
        period: 'weekly',
      },
    });
    for (let i = 0; i < 3; i++) {
      await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          actionType: 'share',
          points: 2,
          multiplierApplied: 1.0 as any,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      });
    }
    const result = await questsService.getWeeklyProgress(user.id);
    expect(result[0].currentCount).toBe(3);
    expect(result[0].completed).toBe(true);
  });
});
