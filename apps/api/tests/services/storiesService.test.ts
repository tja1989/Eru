import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { seedUser, cleanupTestData } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';
import { storiesService } from '../../src/services/storiesService.js';

describe('storiesService', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.story.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('post() creates a story expiring in 24h', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-st1', phone: '+911400000001', username: 'tst1' });
    const story = await storiesService.post(user.id, 'https://media/x.jpg', null);
    const ms = story.expiresAt.getTime() - story.createdAt.getTime();
    expect(ms).toBeCloseTo(24 * 60 * 60 * 1000, -3);
  });

  it('feed() returns stories from users I follow, excluding expired', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-st2', phone: '+911400000002', username: 'tst2' });
    const f = await seedUser({ firebaseUid: 'dev-test-st3', phone: '+911400000003', username: 'tst3' });
    await prisma.follow.create({ data: { followerId: me.id, followingId: f.id } });
    await prisma.story.create({
      data: { userId: f.id, mediaUrl: 'x', expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await prisma.story.create({
      data: { userId: f.id, mediaUrl: 'y', expiresAt: new Date(Date.now() - 60 * 60 * 1000) },
    });

    const list = await storiesService.feed(me.id);
    expect(list).toHaveLength(1);
  });

  it('markViewed creates a StoryView row', async () => {
    const viewer = await seedUser({ firebaseUid: 'dev-test-st4', phone: '+911400000004', username: 'tst4' });
    const author = await seedUser({ firebaseUid: 'dev-test-st5', phone: '+911400000005', username: 'tst5' });
    const story = await prisma.story.create({
      data: { userId: author.id, mediaUrl: 'x', expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await storiesService.markViewed(story.id, viewer.id);
    const view = await prisma.storyView.findUnique({
      where: { storyId_viewerId: { storyId: story.id, viewerId: viewer.id } },
    });
    expect(view).not.toBeNull();
  });
});
