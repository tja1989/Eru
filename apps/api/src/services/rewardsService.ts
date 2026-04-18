import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';
import { randomBytes } from 'node:crypto';

function generateClaimCode(prefix = 'ERU') {
  const rand = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

export const rewardsService = {
  async claimOffer(userId: string, offerId: string) {
    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({ where: { id: offerId } });
      if (!offer) throw Errors.notFound('Offer');
      if (!offer.isActive) throw Errors.badRequest('Offer is not available');
      if (offer.validUntil < new Date()) throw Errors.badRequest('Offer has expired');
      if (offer.stock !== null && offer.stock <= 0) throw Errors.badRequest('Offer is out of stock');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw Errors.notFound('User');
      if (user.currentBalance < offer.pointsCost) {
        throw Errors.badRequest('Insufficient points');
      }

      const existingCount = await tx.userReward.count({
        where: { userId, offerId, status: { not: 'expired' } },
      });
      if (existingCount >= offer.perUserLimit) {
        throw Errors.badRequest(`You have reached the claim limit (${offer.perUserLimit}) for this offer`);
      }

      // Deduct points
      await tx.user.update({
        where: { id: userId },
        data: { currentBalance: { decrement: offer.pointsCost } },
      });

      // Decrement stock if tracked
      if (offer.stock !== null) {
        await tx.offer.update({
          where: { id: offerId },
          data: { stock: { decrement: 1 } },
        });
      }

      // Create the reward
      const reward = await tx.userReward.create({
        data: {
          userId,
          offerId,
          claimCode: generateClaimCode(),
          pointsSpent: offer.pointsCost,
          status: 'active',
          expiresAt: offer.validUntil,
        },
        include: { offer: true },
      });

      return reward;
    });
  },

  async listUserRewards(userId: string, status?: 'active' | 'used' | 'expired') {
    return prisma.userReward.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { offer: { include: { business: true } } },
    });
  },

  async markUsed(userId: string, rewardId: string) {
    const reward = await prisma.userReward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.userId !== userId) throw Errors.notFound('Reward');
    if (reward.status !== 'active') throw Errors.badRequest('Reward is not active');
    return prisma.userReward.update({
      where: { id: rewardId },
      data: { status: 'used', usedAt: new Date() },
    });
  },
};
