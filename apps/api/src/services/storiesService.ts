import { prisma } from '../utils/prisma.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const storiesService = {
  async post(userId: string, mediaUrl: string, thumbnailUrl: string | null) {
    return prisma.story.create({
      data: {
        userId,
        mediaUrl,
        thumbnailUrl,
        expiresAt: new Date(Date.now() + ONE_DAY_MS),
      },
    });
  },

  async feed(userId: string) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followedIds = follows.map((f) => f.followingId);

    return prisma.story.findMany({
      where: {
        userId: { in: [userId, ...followedIds] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        views: { where: { viewerId: userId }, select: { id: true } },
      },
    });
  },

  async markViewed(storyId: string, viewerId: string) {
    return prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      update: {},
      create: { storyId, viewerId },
    });
  },
};
