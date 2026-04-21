import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';
import { emitToUser } from '../ws/gateway.js';

interface NegotiationEntry {
  at: string;
  by: 'creator' | 'business';
  counterBoostAmount: number;
  note?: string;
}

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
    const updated = await prisma.sponsorshipProposal.update({
      where: { id: proposalId },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    try {
      emitToUser(userId, 'proposal:updated', { proposalId, status: 'accepted' });
    } catch { /* gateway optional in tests */ }
    return updated;
  },

  async decline(proposalId: string, userId: string) {
    const p = await prisma.sponsorshipProposal.findUnique({ where: { id: proposalId } });
    if (!p) throw Errors.notFound('Proposal');
    if (p.creatorId !== userId) throw Errors.forbidden();
    const updated = await prisma.sponsorshipProposal.update({
      where: { id: proposalId },
      data: { status: 'declined' },
    });
    try {
      emitToUser(userId, 'proposal:updated', { proposalId, status: 'declined' });
    } catch { /* gateway optional in tests */ }
    return updated;
  },

  // Creator counter-offers with a new boost amount. Appends to the proposal's
  // negotiation_history JSON; proposal stays in 'pending' so the business can
  // respond. Fires "proposal:updated" on the creator's socket room.
  async negotiate(proposalId: string, userId: string, counterBoostAmount: number, note?: string) {
    const p = await prisma.sponsorshipProposal.findUnique({ where: { id: proposalId } });
    if (!p) throw Errors.notFound('Proposal');
    if (p.creatorId !== userId) throw Errors.forbidden();
    if (p.status !== 'pending') throw Errors.badRequest('Only pending proposals can be negotiated');
    if (counterBoostAmount <= 0) throw Errors.badRequest('counterBoostAmount must be positive');

    const history = (p.negotiationHistory as NegotiationEntry[] | null) ?? [];
    const entry: NegotiationEntry = {
      at: new Date().toISOString(),
      by: 'creator',
      counterBoostAmount,
      note,
    };
    const commissionPct = Number(p.commissionPct);
    const newEarnings = (counterBoostAmount * commissionPct) / 100;

    const updated = await prisma.sponsorshipProposal.update({
      where: { id: proposalId },
      data: {
        boostAmount: counterBoostAmount as unknown as never,
        creatorEarnings: newEarnings as unknown as never,
        negotiationHistory: [...history, entry] as unknown as never,
      },
    });
    try {
      emitToUser(userId, 'proposal:updated', { proposalId, status: 'pending', action: 'negotiate' });
    } catch { /* gateway optional in tests */ }
    return updated;
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
