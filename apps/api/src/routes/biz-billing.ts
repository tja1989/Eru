import type { FastifyInstance } from 'fastify';
import type {
  BizBillingResponse,
  BizPlanTier,
  BizPlanTierDef,
  BizPlansResponse,
  BizTransaction,
  BizTxKind,
} from '@eru/shared';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';

// Plan catalog — kept in lockstep with the tier defaults baked into
// /biz/onboarding/plan (biz.ts B6.1). When this list changes, those
// defaults must change too; both reference the same monthlyCapAmount
// and pincodeCap so the onboarding cards never lie about what an owner
// is paying for.
const PLAN_CATALOG: BizPlanTierDef[] = [
  {
    tier: 'starter',
    monthlyPrice: 500,
    monthlyCapAmount: 500,
    pincodeCap: 1,
    features: ['1 pincode', 'Basic dashboard', 'Email support'],
  },
  {
    tier: 'growth',
    monthlyPrice: 5000,
    monthlyCapAmount: 5000,
    pincodeCap: 5,
    features: ['5 pincodes', 'UGC boost', 'Audience analytics', 'Priority support'],
  },
  {
    tier: 'pro',
    monthlyPrice: 12000,
    monthlyCapAmount: 12000,
    pincodeCap: 20,
    features: ['20 pincodes', 'Sponsored campaigns', 'Creator marketplace', 'Dedicated CSM'],
  },
];

function asNumber(v: { toNumber(): number } | number): number {
  return typeof v === 'number' ? v : v.toNumber();
}

export async function bizBillingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /biz/plans — static plan catalog. Any authenticated user can
  // read this (the onboarding plans screen calls it before the user
  // even owns a Business row).
  app.get('/biz/plans', async (request): Promise<BizPlansResponse> => {
    if (!request.userId) throw Errors.unauthorized('Authentication required');
    return { tiers: PLAN_CATALOG };
  });

  // GET /biz/billing — current plan + ledger for the owner's business.
  //  - currentTier / monthlyCapAmount: from BusinessPlan (nullable if
  //    the owner hasn't picked a plan yet).
  //  - spentThisMonth: sum of |amount| across negative-amount
  //    transactions (campaign_debit, ugc_boost_debit) created this
  //    calendar month.
  //  - remaining: sum of ALL signed amounts — i.e. balance. Matches the
  //    convention used by /biz/campaigns launch (which 402s on
  //    insufficient balance).
  //  - transactions: most recent 20, desc by createdAt.
  app.get('/biz/billing', async (request): Promise<BizBillingResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');

    const business = await prisma.business.findFirst({ where: { ownerId: userId } });
    if (!business) throw Errors.forbidden('You do not own a business');

    const plan = await prisma.businessPlan.findUnique({ where: { businessId: business.id } });
    const transactions = await prisma.businessTransaction.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const allTxs = await prisma.businessTransaction.findMany({
      where: { businessId: business.id },
      select: { amount: true, kind: true, createdAt: true },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    let balance = 0;
    let spentThisMonth = 0;
    for (const t of allTxs) {
      const amt = asNumber(t.amount);
      balance += amt;
      if (amt < 0 && t.createdAt >= monthStart) {
        spentThisMonth += -amt;
      }
    }

    const serializedTxs: BizTransaction[] = transactions.map((t) => ({
      id: t.id,
      amount: asNumber(t.amount),
      kind: t.kind as BizTxKind,
      refId: t.refId,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      currentTier: (plan?.tier ?? null) as BizPlanTier | null,
      monthlyCapAmount: plan ? asNumber(plan.monthlyCapAmount) : 0,
      spentThisMonth,
      remaining: balance,
      transactions: serializedTxs,
    };
  });
}
