import { prisma } from '../../src/utils/prisma.js';

export async function seedUser(opts: {
  firebaseUid: string;
  phone: string;
  username: string;
  name?: string;
}) {
  return prisma.user.create({
    data: {
      firebaseUid: opts.firebaseUid,
      phone: opts.phone,
      username: opts.username,
      name: opts.name ?? 'Test User',
      primaryPincode: '000000',
    },
  });
}

export async function seedContent(userId: string, overrides: Partial<{
  text: string;
  type: 'post' | 'reel' | 'poll' | 'thread';
  moderationStatus: 'pending' | 'published' | 'declined';
}> = {}) {
  return prisma.content.create({
    data: {
      userId,
      type: overrides.type ?? 'post',
      text: overrides.text ?? 'A post',
      moderationStatus: overrides.moderationStatus ?? 'published',
      publishedAt: overrides.moderationStatus === 'pending' ? null : new Date(),
    },
  });
}

export async function cleanupTestData() {
  await prisma.message.deleteMany({ where: { sender: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.conversation.deleteMany({ where: { OR: [
    { userA: { firebaseUid: { startsWith: 'dev-test-' } } },
    { userB: { firebaseUid: { startsWith: 'dev-test-' } } },
  ] } });
  await prisma.comment.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.interaction.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.follow.deleteMany({ where: { OR: [
    { follower: { firebaseUid: { startsWith: 'dev-test-' } } },
    { following: { firebaseUid: { startsWith: 'dev-test-' } } },
  ] } });
  await prisma.notification.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.moderationQueue.deleteMany({ where: { content: { user: { firebaseUid: { startsWith: 'dev-test-' } } } } });
  await prisma.contentReport.deleteMany({ where: { OR: [
    { reporter: { firebaseUid: { startsWith: 'dev-test-' } } },
    { content: { user: { firebaseUid: { startsWith: 'dev-test-' } } } },
  ] } });
  await prisma.pollVote.deleteMany({ where: { OR: [
    { user: { firebaseUid: { startsWith: 'dev-test-' } } },
    { pollOption: { content: { user: { firebaseUid: { startsWith: 'dev-test-' } } } } },
  ] } });
  await prisma.pollOption.deleteMany({ where: { content: { user: { firebaseUid: { startsWith: 'dev-test-' } } } } });
  await prisma.highlightItem.deleteMany({ where: { OR: [
    { highlight: { user: { firebaseUid: { startsWith: 'dev-test-' } } } },
    { content: { user: { firebaseUid: { startsWith: 'dev-test-' } } } },
  ] } });
  await prisma.highlight.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.content.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.userReward.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.spinResult.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.pointsLedger.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.userBadge.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.sponsorshipProposal.deleteMany({ where: { creator: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.storyView.deleteMany({ where: { viewer: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.story.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.watchlist.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.user.deleteMany({ where: { firebaseUid: { startsWith: 'dev-test-' } } });
}

export function devToken(firebaseUid: string) {
  return `Bearer ${firebaseUid}`;
}
