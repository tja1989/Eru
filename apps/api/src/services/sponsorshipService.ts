import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';

export const sponsorshipService = {
  async createProposal(businessId: string, creatorId: string, boostAmount: number, contentId?: string) {
    const commissionPct = 20;
    const creatorEarnings = (boostAmount * commissionPct) / 100;
    return prisma.sponsorshipProposal.create({
      data: {
        businessId,
        creatorId,
        contentId,
        boostAmount: boostAmount as any,
        commissionPct: commissionPct as any,
        creatorEarnings: creatorEarnings as any,
      },
    });
  },

  async accept(proposalId: string, userId: string) {
    const p = await prisma.sponsorshipProposal.findUnique({ where: { id: proposalId } });
    if (!p) throw Errors.notFound('Proposal');
    if (p.creatorId !== userId) throw Errors.forbidden();
    if (p.status !== 'pending') throw Errors.badRequest('Proposal is not pending');
    return prisma.sponsorshipProposal.update({
      where: { id: proposalId },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
  },

  async decline(proposalId: string, userId: string) {
    const p = await prisma.sponsorshipProposal.findUnique({ where: { id: proposalId } });
    if (!p) throw Errors.notFound('Proposal');
    if (p.creatorId !== userId) throw Errors.forbidden();
    return prisma.sponsorshipProposal.update({
      where: { id: proposalId },
      data: { status: 'declined' },
    });
  },

  async getCreatorDashboard(creatorId: string) {
    const [active, pending, completed, earningsAgg] = await Promise.all([
      prisma.sponsorshipProposal.findMany({
        where: { creatorId, status: { in: ['accepted', 'active'] } },
        include: { business: true, content: true },
      }),
      prisma.sponsorshipProposal.findMany({
        where: { creatorId, status: 'pending' },
        include: { business: true, content: true },
      }),
      prisma.sponsorshipProposal.count({ where: { creatorId, status: 'completed' } }),
      prisma.sponsorshipProposal.aggregate({
        where: { creatorId, status: { in: ['accepted', 'active', 'completed'] } },
        _sum: { creatorEarnings: true },
      }),
    ]);

    return {
      activeCount: active.length,
      pendingCount: pending.length,
      completedCount: completed,
      totalEarnings: earningsAgg._sum.creatorEarnings ?? 0,
      active,
      pending,
    };
  },
};
