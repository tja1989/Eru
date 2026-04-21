import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';
import { rewardsService } from '../services/rewardsService.js';
import { prisma } from '../utils/prisma.js';
import { z } from 'zod';
import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Hardcoded recharge plans — this is a stub. When we add real integration
// with a carrier API, this table moves to the DB and is pulled live. For
// now it lets the UI flow complete end-to-end with a real point-deduction.
// ---------------------------------------------------------------------------
const RECHARGE_PLANS: Record<string, { amountRupees: number; pointsCost: number; operator: string }> = {
  jio_149: { amountRupees: 149, pointsCost: 1490, operator: 'Jio' },
  jio_239: { amountRupees: 239, pointsCost: 2390, operator: 'Jio' },
  jio_479: { amountRupees: 479, pointsCost: 4790, operator: 'Jio' },
};

const rechargeSchema = z.object({
  planId: z.string().min(1),
  // +91 followed by 10 digits, with optional spaces/dashes. Keeps the PWA
  // "+91 98765 43210" format while also accepting the compact wire format.
  phone: z.string().regex(/^\+91[-\s]?\d{5}[-\s]?\d{5}$/, 'Invalid phone'),
});

function generateClaimCode(): string {
  return `RC-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function rewardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  const statusSchema = z.object({
    status: z.enum(['active', 'used', 'expired']).optional(),
  });

  app.get('/rewards', async (request) => {
    const parsed = statusSchema.safeParse(request.query);
    if (!parsed.success) throw Errors.badRequest('Invalid status');
    const rewards = await rewardsService.listUserRewards(request.userId, parsed.data.status);
    return { rewards };
  });

  app.put('/rewards/:id/use', async (request) => {
    const { id } = request.params as { id: string };
    const reward = await rewardsService.markUsed(request.userId, id);
    return { reward };
  });

  // POST /rewards/recharge — create a placeholder recharge voucher. No real
  // carrier integration yet; the row lets the wallet flow complete + debits
  // the user's points atomically.
  app.post('/rewards/recharge', async (request, reply) => {
    const parsed = rechargeSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }
    const { planId, phone } = parsed.data;

    const plan = RECHARGE_PLANS[planId];
    if (!plan) throw Errors.badRequest(`Unknown recharge plan: ${planId}`);

    // Upsert a synthetic Offer row for this plan so UserReward's FK stays
    // satisfied. Idempotent — same planId always maps to the same row.
    const offer = await prisma.offer.upsert({
      where: { id: `recharge-${planId}` },
      update: {},
      create: {
        id: `recharge-${planId}`,
        type: 'recharge',
        title: `${plan.operator} ₹${plan.amountRupees} recharge`,
        pointsCost: plan.pointsCost,
        cashValue: plan.amountRupees,
        perUserLimit: 1000, // recharges aren't per-user-limited
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    // Atomic: balance check + decrement + ledger + reward. The optimistic
    // where-clause on user.update enforces no-double-spend; if another
    // recharge lands simultaneously and eats the balance, this throws.
    try {
      const [, , reward] = await prisma.$transaction([
        prisma.user.update({
          where: { id: request.userId, currentBalance: { gte: plan.pointsCost } },
          data: { currentBalance: { decrement: plan.pointsCost } },
        }),
        prisma.pointsLedger.create({
          data: {
            userId: request.userId,
            actionType: 'redeem',
            points: -plan.pointsCost,
            multiplierApplied: 1.0,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        }),
        prisma.userReward.create({
          data: {
            userId: request.userId,
            offerId: offer.id,
            claimCode: generateClaimCode(),
            pointsSpent: plan.pointsCost,
            status: 'active',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      const refreshed = await prisma.user.findUnique({ where: { id: request.userId }, select: { currentBalance: true } });
      return reply.status(201).send({ reward, newBalance: refreshed?.currentBalance ?? 0 });
    } catch (err: any) {
      // P2025 = "Record to update not found" — triggered by the optimistic
      // where-clause when the user doesn't actually have enough points.
      if (err?.code === 'P2025') {
        throw Errors.paymentRequired('Insufficient points for this recharge');
      }
      throw err;
    }
  });
}
