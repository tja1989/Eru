import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { creatorScoreService } from '../../src/services/creatorScoreService.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

describe('creatorScoreService.recalculate', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('returns 50 for a user with no posts', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-cs1',
      phone: '+919800000001',
      username: 'tcs1',
    });

    const score = await creatorScoreService.recalculate(user.id);

    expect(score).toBe(50);
    // Verify the DB value is still the default 50
    const fetched = await prisma.user.findUnique({ where: { id: user.id } });
    expect(Number(fetched!.creatorScore)).toBeCloseTo(50, 1);
  });

  it('calculates correct score for known engagement counts', async () => {
    // Formula: (likes + 0.3*comments + 5*trending - 0.5*dislikes) / posts
    // With likeCount=10, commentCount=5, dislikeCount=2, isTrending=true, posts=1:
    // (10 + 0.3*5 + 5*1 - 0.5*2) / 1 = (10 + 1.5 + 5 - 1) / 1 = 15.5
    const user = await seedUser({
      firebaseUid: 'dev-test-cs2',
      phone: '+919800000002',
      username: 'tcs2',
    });

    await prisma.content.create({
      data: {
        userId: user.id,
        type: 'post',
        text: 'Test post',
        moderationStatus: 'published',
        publishedAt: new Date(),
        likeCount: 10,
        commentCount: 5,
        dislikeCount: 2,
        isTrending: true,
      },
    });

    const score = await creatorScoreService.recalculate(user.id);

    expect(score).toBeCloseTo(15.5, 1);

    // Verify DB was updated
    const fetched = await prisma.user.findUnique({ where: { id: user.id } });
    expect(Number(fetched!.creatorScore)).toBeCloseTo(15.5, 1);
  });

  it('clamps score to 100 when raw value exceeds 100', async () => {
    // likeCount=10000 on 1 post → raw = 10000 / 1 = 10000, clamped to 100
    const user = await seedUser({
      firebaseUid: 'dev-test-cs3',
      phone: '+919800000003',
      username: 'tcs3',
    });

    await prisma.content.create({
      data: {
        userId: user.id,
        type: 'post',
        text: 'Viral post',
        moderationStatus: 'published',
        publishedAt: new Date(),
        likeCount: 10000,
      },
    });

    const score = await creatorScoreService.recalculate(user.id);

    expect(score).toBe(100);
  });

  it('clamps score to 0 when raw value goes negative', async () => {
    // dislikeCount=10000, likeCount=0 on 1 post → raw = -0.5*10000 / 1 = -5000, clamped to 0
    const user = await seedUser({
      firebaseUid: 'dev-test-cs4',
      phone: '+919800000004',
      username: 'tcs4',
    });

    await prisma.content.create({
      data: {
        userId: user.id,
        type: 'post',
        text: 'Divisive post',
        moderationStatus: 'published',
        publishedAt: new Date(),
        dislikeCount: 10000,
        likeCount: 0,
      },
    });

    const score = await creatorScoreService.recalculate(user.id);

    expect(score).toBe(0);
  });

  it('only counts published content, not pending', async () => {
    // User has 1 pending post with high likes — should return 50 (no published posts)
    const user = await seedUser({
      firebaseUid: 'dev-test-cs5',
      phone: '+919800000005',
      username: 'tcs5',
    });

    await prisma.content.create({
      data: {
        userId: user.id,
        type: 'post',
        text: 'Pending post',
        moderationStatus: 'pending',
        publishedAt: null,
        likeCount: 9999,
      },
    });

    const score = await creatorScoreService.recalculate(user.id);

    expect(score).toBe(50);
  });
});
