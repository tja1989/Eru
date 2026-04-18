import { describe, it, expect, afterAll } from 'vitest';
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
});
