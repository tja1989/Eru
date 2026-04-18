import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function cleanupQuestsData() {
  await prisma.userQuestProgress.deleteMany({});
  await prisma.quest.deleteMany({});
  await prisma.pointsLedger.deleteMany({
    where: { user: { firebaseUid: { startsWith: 'dev-test-' } } },
  });
  await cleanupTestData();
}

describe('GET /api/v1/quests/weekly', () => {
  beforeEach(cleanupQuestsData);
  afterAll(async () => {
    await cleanupQuestsData();
    await closeTestApp();
  });

  it("returns the user's weekly quest progress", async () => {
    await seedUser({
      firebaseUid: 'dev-test-qr1',
      phone: '+919900000010',
      username: 'tqr1',
    });
    await prisma.quest.create({
      data: {
        id: 'qz',
        title: 'Like 5 posts',
        actionType: 'like',
        targetCount: 5,
        rewardPoints: 25,
        period: 'weekly',
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/quests/weekly',
      headers: { Authorization: devToken('dev-test-qr1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.quests).toHaveLength(1);
    expect(body.quests[0].title).toBe('Like 5 posts');
    expect(body.quests[0].currentCount).toBe(0);
    expect(body.quests[0].completed).toBe(false);
  });
});
