import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';

describe('P1 schema sanity', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('can count all new tables without error', async () => {
    await expect(prisma.business.count()).resolves.toBeTypeOf('number');
    await expect(prisma.offer.count()).resolves.toBeTypeOf('number');
    await expect(prisma.userReward.count()).resolves.toBeTypeOf('number');
    await expect(prisma.quest.count()).resolves.toBeTypeOf('number');
    await expect(prisma.userQuestProgress.count()).resolves.toBeTypeOf('number');
    await expect(prisma.spinResult.count()).resolves.toBeTypeOf('number');
    await expect(prisma.badge.count()).resolves.toBeTypeOf('number');
    await expect(prisma.userBadge.count()).resolves.toBeTypeOf('number');
  });

  it('can count P2 tables', async () => {
    await expect(prisma.conversation.count()).resolves.toBeTypeOf('number');
    await expect(prisma.message.count()).resolves.toBeTypeOf('number');
    await expect(prisma.sponsorshipProposal.count()).resolves.toBeTypeOf('number');
    await expect(prisma.story.count()).resolves.toBeTypeOf('number');
    await expect(prisma.storyView.count()).resolves.toBeTypeOf('number');
  });

  it('can count P3 tables', async () => {
    await expect(prisma.pollOption.count()).resolves.toBeTypeOf('number');
    await expect(prisma.pollVote.count()).resolves.toBeTypeOf('number');
  });

  it('can count F7.1 highlight tables', async () => {
    await expect(prisma.highlight.count()).resolves.toBeTypeOf('number');
    await expect(prisma.highlightItem.count()).resolves.toBeTypeOf('number');
  });

  it('Content has thread columns (threadParentId + threadPosition)', async () => {
    // If the columns don't exist in the DB, this query would throw a Prisma error.
    // A successful count proves the columns are live and the Prisma client knows them.
    await expect(
      prisma.content.count({ where: { threadPosition: null } })
    ).resolves.toBeTypeOf('number');
    await expect(
      prisma.content.count({ where: { threadParentId: null } })
    ).resolves.toBeTypeOf('number');
  });

  it('F8.1: Content.taggedUserIds persists and reads back correctly', async () => {
    // Create a temp user to be tagged and another to be the author
    const author = await prisma.user.create({
      data: { firebaseUid: 'dev-test-tag-schema1', phone: '+919900000001', username: 'ttagsch1', name: 'Schema Tag Author', primaryPincode: '000000' },
    });
    const tagged = await prisma.user.create({
      data: { firebaseUid: 'dev-test-tag-schema2', phone: '+919900000002', username: 'ttagsch2', name: 'Schema Tagged User', primaryPincode: '000000' },
    });

    const content = await prisma.content.create({
      data: {
        userId: author.id,
        type: 'post',
        text: 'Tagging test',
        moderationStatus: 'published',
        publishedAt: new Date(),
        taggedUserIds: [tagged.id],
      },
    });

    const fetched = await prisma.content.findUnique({ where: { id: content.id } });
    expect(fetched?.taggedUserIds).toEqual([tagged.id]);

    // Cleanup
    await prisma.content.delete({ where: { id: content.id } });
    await prisma.user.deleteMany({ where: { firebaseUid: { in: ['dev-test-tag-schema1', 'dev-test-tag-schema2'] } } });
  });
});
