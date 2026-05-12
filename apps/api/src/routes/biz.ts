import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  BizAudienceBucket,
  BizAudienceResponse,
  BizBusinessSummary,
  BizCampaign,
  BizCampaignListResponse,
  BizCampaignStatus,
  BizCampaignType,
  BizDashboardPeriod,
  BizDashboardResponse,
  BizFeedbackItem,
  BizFeedbackResponse,
  BizMeResponse,
  BizOfferItem,
  BizOfferType,
  BizOffersResponse,
  BizOnboardingSetupResponse,
  BizPaymentResponse,
  BizPlanResponse,
  BizPlanTier,
  BizQrScanResponse,
  BizUgcContentItem,
  BizUgcResponse,
} from '@eru/shared';
import { sponsorshipService } from '../services/sponsorshipService.js';
import { verifySignedCode } from '../utils/hmac.js';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';
import {
  bizOfferCreateSchema,
  bizOfferPatchSchema,
  bizOnboardingSetupSchema,
  bizPaymentSchema,
  bizPincodesSchema,
  bizPlanSchema,
  bizQrScanSchema,
  campaignCreateSchema,
  campaignListQuerySchema,
  campaignPatchSchema,
  feedbackListQuerySchema,
  feedbackReplySchema,
  ugcBoostSchema,
} from '../utils/validators.js';

const dashboardQuerySchema = z.object({
  period: z.enum(['week', 'month', '90d']).optional(),
});

function periodToDays(p: BizDashboardPeriod): number {
  return p === 'week' ? 7 : p === 'month' ? 30 : 90;
}

type CampaignRow = {
  id: string;
  businessId: string;
  type: BizCampaignType;
  status: BizCampaignStatus;
  title: string;
  body: string | null;
  imageUrl: string | null;
  pincodes: string[];
  ageRanges: string[];
  interests: string[];
  budget: { toNumber(): number } | number;
  spent: { toNumber(): number } | number;
  startDate: Date | null;
  endDate: Date | null;
  offerId: string | null;
  impressions: number;
  clicks: number;
  claims: number;
  storeVisits: number;
  createdAt: Date;
  updatedAt: Date;
};

function asNumber(v: { toNumber(): number } | number): number {
  return typeof v === 'number' ? v : v.toNumber();
}

function serializeCampaign(c: CampaignRow): BizCampaign {
  return {
    id: c.id,
    businessId: c.businessId,
    type: c.type,
    status: c.status,
    title: c.title,
    body: c.body,
    imageUrl: c.imageUrl,
    pincodes: c.pincodes,
    ageRanges: c.ageRanges,
    interests: c.interests,
    budget: asNumber(c.budget),
    spent: asNumber(c.spent),
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
    offerId: c.offerId,
    impressions: c.impressions,
    clicks: c.clicks,
    claims: c.claims,
    storeVisits: c.storeVisits,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// Sum of all BusinessTransaction.amount for the business. With our convention
// (topup/refund/adjustment positive, *_debit negative), this is the live balance.
async function getBalance(businessId: string): Promise<number> {
  const txs = await prisma.businessTransaction.findMany({
    where: { businessId },
    select: { amount: true },
  });
  return txs.reduce((s, t) => s + Number(t.amount), 0);
}

// ---------- helpers ----------

function serializeBusiness(b: {
  id: string;
  name: string;
  category: string;
  pincode: string;
  address: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isVerified: boolean;
  targetPincodes: string[];
  followerCount: number;
  rating: { toNumber(): number } | number;
  reviewCount: number;
  createdAt: Date;
}): BizBusinessSummary {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    pincode: b.pincode,
    address: b.address,
    phone: b.phone,
    avatarUrl: b.avatarUrl,
    bannerUrl: b.bannerUrl,
    isVerified: b.isVerified,
    targetPincodes: b.targetPincodes,
    followerCount: b.followerCount,
    rating: typeof b.rating === 'number' ? b.rating : b.rating.toNumber(),
    reviewCount: b.reviewCount,
    createdAt: b.createdAt.toISOString(),
  };
}

// Used by every owner-scoped /biz/* route after /biz/me. Throws 403 if the
// caller doesn't own a business — keeps each handler from re-querying.
export async function requireBusinessOwner(userId: string) {
  const business = await prisma.business.findFirst({ where: { ownerId: userId } });
  if (!business) {
    throw Errors.forbidden('You do not own a business — set one up via /biz/onboarding/setup first');
  }
  return business;
}

// ---------- routes ----------

export async function bizRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /biz/me — the layout-gate handshake. Returns null business if the
  // user has not yet completed onboarding, signaling the mobile (biz) layout
  // to redirect to /(biz)/onboarding/welcome.
  app.get('/biz/me', async (request): Promise<BizMeResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const business = await prisma.business.findFirst({ where: { ownerId: userId } });
    return { business: business ? serializeBusiness(business) : null };
  });

  // GET /biz/dashboard?period=week|month|90d — owner-side KPI digest.
  //
  // Window semantics:
  //  - KPI counters (impressions/clicks/claims/visits) sum CampaignEvents whose
  //    createdAt falls inside the window — gives true period-windowed analytics
  //    rather than the cumulative Campaign.* counters.
  //  - `spent` is the sum of all active/completed Campaign.spent for this owner
  //    (cumulative; period filtering would require event-level ledger entries
  //    which B2.2's launch debit doesn't write yet — fine for MVP).
  //  - dailyImpressions is always length 7 (last 7 days), regardless of period;
  //    the mobile chart is a 7-day rolling sparkline.
  //  - sentiment + recentActivity are zeroed for now — B4 wires them in.
  app.get('/biz/dashboard', async (request): Promise<BizDashboardResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');

    const parsed = dashboardQuerySchema.safeParse(request.query);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const period: BizDashboardPeriod = parsed.data.period ?? 'week';

    const business = await requireBusinessOwner(userId);

    const days = periodToDays(period);
    const windowStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * days);
    const sevenDaysStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

    const campaigns = await prisma.campaign.findMany({
      where: { businessId: business.id },
      select: { id: true, spent: true },
    });
    const campaignIds = campaigns.map((c) => c.id);
    const spent = campaigns.reduce((s, c) => s + Number(c.spent), 0);

    // Single query: pull all relevant events in the union of (window) ∪ (last 7 days)
    // so we can compute KPIs and the sparkline without two trips. We filter in-memory.
    const queryStart = windowStart < sevenDaysStart ? windowStart : sevenDaysStart;
    const events = campaignIds.length
      ? await prisma.campaignEvent.findMany({
          where: { campaignId: { in: campaignIds }, createdAt: { gte: queryStart } },
          select: { kind: true, createdAt: true },
        })
      : [];

    let impressions = 0;
    let clicks = 0;
    let claims = 0;
    let visits = 0;
    const daily = [0, 0, 0, 0, 0, 0, 0]; // index 0 = 6 days ago, index 6 = today
    const now = Date.now();
    for (const e of events) {
      const inWindow = e.createdAt >= windowStart;
      if (inWindow) {
        if (e.kind === 'impression') impressions++;
        else if (e.kind === 'click') clicks++;
        else if (e.kind === 'claim') claims++;
        else if (e.kind === 'visit') visits++;
      }
      if (e.kind === 'impression' && e.createdAt >= sevenDaysStart) {
        const daysAgo = Math.floor((now - e.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const bucket = 6 - Math.min(daysAgo, 6);
        if (bucket >= 0 && bucket < 7) daily[bucket]++;
      }
    }

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const costPerVisit = visits > 0 ? spent / visits : 0;

    return {
      period,
      kpis: { impressions, clicks, ctr, claims, visits, spent, costPerVisit },
      dailyImpressions: daily,
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      recentActivity: [],
    };
  });

  // ---------- Campaigns CRUD (B2.2) ----------

  // GET /biz/campaigns?status= — list the owner's campaigns, optionally
  // filtered by status. Returns most-recent first so the campaigns tab
  // reads chronologically.
  app.get('/biz/campaigns', async (request): Promise<BizCampaignListResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = campaignListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);

    const business = await requireBusinessOwner(userId);
    const items = await prisma.campaign.findMany({
      where: { businessId: business.id, ...(parsed.data.status ? { status: parsed.data.status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return { items: items.map((c) => serializeCampaign(c as CampaignRow)) };
  });

  // POST /biz/campaigns — create a draft campaign owned by the caller's
  // business. Drafts are editable; launch is a separate step so the wizard
  // can save partial work and the owner can review before paying.
  app.post('/biz/campaigns', async (request): Promise<BizCampaign> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = campaignCreateSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);

    const business = await requireBusinessOwner(userId);
    const data = parsed.data;
    const created = await prisma.campaign.create({
      data: {
        businessId: business.id,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        imageUrl: data.imageUrl ?? null,
        pincodes: data.pincodes ?? [],
        ageRanges: data.ageRanges ?? [],
        interests: data.interests ?? [],
        budget: data.budget ?? 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        offerId: data.offerId ?? null,
      },
    });
    return serializeCampaign(created as CampaignRow);
  });

  // PATCH /biz/campaigns/:id — edit a DRAFT campaign. 409 once the campaign
  // is active/paused/completed; edits after launch would invalidate the
  // already-debited budget and confuse attribution.
  app.patch<{ Params: { id: string } }>('/biz/campaigns/:id', async (request): Promise<BizCampaign> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = campaignPatchSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);

    const business = await requireBusinessOwner(userId);
    const existing = await prisma.campaign.findUnique({ where: { id: request.params.id } });
    if (!existing || existing.businessId !== business.id) throw Errors.notFound('Campaign');
    if (existing.status !== 'draft') {
      throw Errors.conflict('Only draft campaigns can be edited');
    }

    const data = parsed.data;
    const updated = await prisma.campaign.update({
      where: { id: existing.id },
      data: {
        type: data.type,
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl,
        pincodes: data.pincodes,
        ageRanges: data.ageRanges,
        interests: data.interests,
        budget: data.budget,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        offerId: data.offerId,
      },
    });
    return serializeCampaign(updated as CampaignRow);
  });

  // POST /biz/campaigns/:id/launch — flip status draft→active atomically
  // with a campaign_debit BusinessTransaction and a launch CampaignEvent.
  // Uses interactive prisma.$transaction so all three writes succeed or
  // none do (matches the repo's transaction convention — see content.ts).
  app.post<{ Params: { id: string } }>('/biz/campaigns/:id/launch', async (request): Promise<BizCampaign> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');

    const business = await requireBusinessOwner(userId);
    const existing = await prisma.campaign.findUnique({ where: { id: request.params.id } });
    if (!existing || existing.businessId !== business.id) throw Errors.notFound('Campaign');
    if (existing.status !== 'draft') {
      throw Errors.conflict('Only draft campaigns can be launched');
    }

    const budget = Number(existing.budget);
    if (budget > 0) {
      const balance = await getBalance(business.id);
      if (balance < budget) {
        throw Errors.paymentRequired(
          `Insufficient balance: need ${budget}, have ${balance}. Top up to continue.`,
        );
      }
    }

    const launched = await prisma.$transaction(async (tx) => {
      const updated = await tx.campaign.update({
        where: { id: existing.id },
        data: { status: 'active' },
      });
      if (budget > 0) {
        await tx.businessTransaction.create({
          data: {
            businessId: business.id,
            amount: -budget,
            kind: 'campaign_debit',
            refId: existing.id,
          },
        });
      }
      await tx.campaignEvent.create({
        data: { campaignId: existing.id, kind: 'launch' },
      });
      return updated;
    });

    return serializeCampaign(launched as CampaignRow);
  });

  // ---------- UGC: list tagged content + boost (B4.1) ----------

  // GET /biz/ugc — content tagged to the owner's business, split into
  // newTags (no sponsorship yet) vs activeSponsorships (proposal in
  // accepted/active status). Reuse of existing SponsorshipProposal model
  // means we don't introduce a new "boost" table.
  app.get('/biz/ugc', async (request): Promise<BizUgcResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const business = await requireBusinessOwner(userId);

    const tagged = await prisma.content.findMany({
      where: { businessTagId: business.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    const proposals = await prisma.sponsorshipProposal.findMany({
      where: {
        businessId: business.id,
        contentId: { in: tagged.map((c) => c.id) },
        status: { in: ['accepted', 'active'] },
      },
      select: { id: true, contentId: true, reach: true },
    });
    const sponsoredByContentId = new Map(proposals.map((p) => [p.contentId, p]));

    function toItem(c: typeof tagged[number]): BizUgcContentItem {
      const proposal = c.id ? sponsoredByContentId.get(c.id) : undefined;
      return {
        id: c.id,
        authorId: c.user.id,
        authorUsername: c.user.username,
        authorAvatarUrl: c.user.avatarUrl,
        text: c.text ?? '',
        imageUrl: null,
        createdAt: c.createdAt.toISOString(),
        isSponsored: !!proposal,
        sponsorshipId: proposal?.id ?? null,
      };
    }

    const newTags: BizUgcContentItem[] = [];
    const activeSponsorships: BizUgcContentItem[] = [];
    for (const c of tagged) {
      const item = toItem(c);
      if (item.isSponsored) activeSponsorships.push(item);
      else newTags.push(item);
    }

    const reachEstimate = proposals.reduce((sum, p) => sum + (p.reach ?? 0), 0);

    return {
      stats: { tagged: tagged.length, sponsored: proposals.length, reachEstimate },
      newTags,
      activeSponsorships,
    };
  });

  // POST /biz/ugc/:contentId/boost — wraps the existing
  // SponsorshipProposal model. 404 if the content isn't tagged to this
  // business (prevents owners from boosting unrelated UGC).
  app.post<{ Params: { contentId: string } }>(
    '/biz/ugc/:contentId/boost',
    async (request): Promise<{ proposalId: string }> => {
      const userId = request.userId;
      if (!userId) throw Errors.unauthorized('Authentication required');
      const parsed = ugcBoostSchema.safeParse(request.body);
      if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);

      const business = await requireBusinessOwner(userId);
      const content = await prisma.content.findUnique({ where: { id: request.params.contentId } });
      if (!content || content.businessTagId !== business.id) {
        throw Errors.notFound('Content');
      }

      const proposal = await sponsorshipService.createProposal(
        business.id,
        content.userId,
        parsed.data.amount,
        content.id,
      );
      return { proposalId: proposal.id };
    },
  );

  // ---------- Feedback: list reviews + owner reply (B4.2) ----------

  // Sentiment classification is a like/dislike heuristic for the MVP — no
  // sentiment column exists on Content. Positive when likes outnumber
  // dislikes, negative when the reverse, neutral when tied or both zero.
  // The mobile chart consumes whatever this returns, so changing the
  // heuristic later doesn't ripple beyond this function.
  function classifySentiment(likes: number, dislikes: number): 'positive' | 'neutral' | 'negative' {
    if (likes > dislikes) return 'positive';
    if (dislikes > likes) return 'negative';
    return 'neutral';
  }

  app.get('/biz/feedback', async (request): Promise<BizFeedbackResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = feedbackListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const business = await requireBusinessOwner(userId);

    const tagged = await prisma.content.findMany({
      where: { businessTagId: business.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    // Pull the latest owner-authored Comment per content in one round-trip.
    const replies = await prisma.comment.findMany({
      where: {
        contentId: { in: tagged.map((c) => c.id) },
        userId,
        parentId: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { contentId: true, text: true, createdAt: true },
    });
    const replyByContent = new Map<string, { text: string; createdAt: string }>();
    for (const r of replies) {
      if (!replyByContent.has(r.contentId)) {
        replyByContent.set(r.contentId, { text: r.text, createdAt: r.createdAt.toISOString() });
      }
    }

    const items: BizFeedbackItem[] = tagged.map((c) => {
      const sentiment = classifySentiment(c.likeCount, c.dislikeCount);
      return {
        contentId: c.id,
        authorId: c.user.id,
        authorUsername: c.user.username,
        authorAvatarUrl: c.user.avatarUrl,
        text: c.text ?? '',
        rating: null,
        sentiment,
        createdAt: c.createdAt.toISOString(),
        reply: replyByContent.get(c.id) ?? null,
      };
    });

    const filtered = parsed.data.sentiment ? items.filter((i) => i.sentiment === parsed.data.sentiment) : items;
    return { items: filtered };
  });

  app.post<{ Params: { contentId: string } }>(
    '/biz/feedback/:contentId/reply',
    async (request): Promise<{ reply: { text: string; createdAt: string } }> => {
      const userId = request.userId;
      if (!userId) throw Errors.unauthorized('Authentication required');
      const parsed = feedbackReplySchema.safeParse(request.body);
      if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);

      const business = await requireBusinessOwner(userId);
      const content = await prisma.content.findUnique({ where: { id: request.params.contentId } });
      if (!content) throw Errors.notFound('Content');
      if (content.businessTagId !== business.id) {
        throw Errors.forbidden('Content is not tagged to your business');
      }

      const created = await prisma.comment.create({
        data: { userId, contentId: content.id, text: parsed.data.text },
      });
      return { reply: { text: created.text, createdAt: created.createdAt.toISOString() } };
    },
  );

  // ---------- Audience aggregation (B5.1) ----------

  // Audience = the set of users who either interacted with content tagged
  // to this business OR redeemed one of the business's offers. We pull
  // both sources, dedupe by userId for demographic counts, but keep all
  // interaction timestamps for peakHours.
  app.get('/biz/audience', async (request): Promise<BizAudienceResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const business = await requireBusinessOwner(userId);

    const taggedContent = await prisma.content.findMany({
      where: { businessTagId: business.id, deletedAt: null },
      select: { id: true },
    });
    const taggedIds = taggedContent.map((c) => c.id);

    const businessOffers = await prisma.offer.findMany({
      where: { businessId: business.id },
      select: { id: true },
    });
    const offerIds = businessOffers.map((o) => o.id);

    const interactions = taggedIds.length
      ? await prisma.interaction.findMany({
          where: { contentId: { in: taggedIds } },
          select: { userId: true, createdAt: true },
        })
      : [];
    const rewards = offerIds.length
      ? await prisma.userReward.findMany({
          where: { offerId: { in: offerIds } },
          select: { userId: true, usedAt: true, createdAt: true },
        })
      : [];

    // Distinct userIds for demographic aggregation
    const userIds = new Set<string>();
    interactions.forEach((i) => userIds.add(i.userId));
    rewards.forEach((r) => userIds.add(r.userId));

    const users = userIds.size
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { dob: true, primaryPincode: true, interests: true },
        })
      : [];

    // Age buckets — bands chosen to match common analytics dashboards.
    const ageBands: Array<{ label: string; min: number; max: number }> = [
      { label: '13-17', min: 13, max: 17 },
      { label: '18-24', min: 18, max: 24 },
      { label: '25-34', min: 25, max: 34 },
      { label: '35-44', min: 35, max: 44 },
      { label: '45-54', min: 45, max: 54 },
      { label: '55+', min: 55, max: 999 },
    ];
    const ageCount = new Map<string, number>();
    const pincodeCount = new Map<string, number>();
    const interestCount = new Map<string, number>();
    const now = Date.now();
    for (const u of users) {
      if (u.dob) {
        const ageYears = Math.floor((now - u.dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        const band = ageBands.find((b) => ageYears >= b.min && ageYears <= b.max);
        if (band) ageCount.set(band.label, (ageCount.get(band.label) ?? 0) + 1);
      }
      if (u.primaryPincode) {
        pincodeCount.set(u.primaryPincode, (pincodeCount.get(u.primaryPincode) ?? 0) + 1);
      }
      for (const i of u.interests) {
        interestCount.set(i, (interestCount.get(i) ?? 0) + 1);
      }
    }

    // Peak hours: 24-slot count, IST (UTC+5:30) so an Indian audience reads naturally.
    const peakHours = Array(24).fill(0) as number[];
    const ISTOffsetMs = 5.5 * 60 * 60 * 1000;
    for (const i of interactions) {
      const istHour = new Date(i.createdAt.getTime() + ISTOffsetMs).getUTCHours();
      peakHours[istHour]++;
    }
    for (const r of rewards) {
      // Prefer the actual redemption time; fall back to claim time so the
      // hour-of-day reflects when the user engaged, not just when they earned.
      const when = r.usedAt ?? r.createdAt;
      const istHour = new Date(when.getTime() + ISTOffsetMs).getUTCHours();
      peakHours[istHour]++;
    }

    function toBuckets(map: Map<string, number>, limit = 10): BizAudienceBucket[] {
      return Array.from(map.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    }

    return {
      ageBuckets: toBuckets(ageCount),
      topPincodes: toBuckets(pincodeCount),
      peakHours,
      topInterests: toBuckets(interestCount),
    };
  });

  // ---------- Owner-side Offers (B5.2) ----------

  function serializeOffer(o: {
    id: string;
    type: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    pointsCost: number;
    cashValue: { toNumber(): number } | number;
    stock: number | null;
    perUserLimit: number;
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
    createdAt: Date;
  }): BizOfferItem {
    return {
      id: o.id,
      type: o.type as BizOfferType,
      title: o.title,
      description: o.description,
      imageUrl: o.imageUrl,
      pointsCost: o.pointsCost,
      cashValue: asNumber(o.cashValue),
      stock: o.stock,
      perUserLimit: o.perUserLimit,
      validFrom: o.validFrom.toISOString(),
      validUntil: o.validUntil.toISOString(),
      isActive: o.isActive,
      createdAt: o.createdAt.toISOString(),
    };
  }

  app.get('/biz/offers', async (request): Promise<BizOffersResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const business = await requireBusinessOwner(userId);
    const items = await prisma.offer.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    return { items: items.map(serializeOffer) };
  });

  app.post('/biz/offers', async (request): Promise<BizOfferItem> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = bizOfferCreateSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const business = await requireBusinessOwner(userId);
    const data = parsed.data;
    const created = await prisma.offer.create({
      data: {
        type: data.type,
        businessId: business.id,
        title: data.title,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        pointsCost: data.pointsCost,
        cashValue: data.cashValue,
        stock: data.stock ?? null,
        perUserLimit: data.perUserLimit ?? 1,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
      },
    });
    return serializeOffer(created);
  });

  app.patch<{ Params: { id: string } }>('/biz/offers/:id', async (request): Promise<BizOfferItem> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = bizOfferPatchSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const business = await requireBusinessOwner(userId);

    // Scope the update to the owner's business — cross-business writes
    // return 404 to avoid leaking the existence of another owner's offer.
    const existing = await prisma.offer.findUnique({ where: { id: request.params.id } });
    if (!existing || existing.businessId !== business.id) throw Errors.notFound('Offer');

    const data = parsed.data;
    const updated = await prisma.offer.update({
      where: { id: existing.id },
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        pointsCost: data.pointsCost,
        cashValue: data.cashValue,
        stock: data.stock,
        perUserLimit: data.perUserLimit,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        isActive: data.isActive,
      },
    });
    return serializeOffer(updated);
  });

  // ---------- QR scan: redeem a reward + log a visit (B5.3) ----------

  // POST /biz/qrscan — owner scans a customer's reward QR. Reuses the
  // rewardsService.markUsed semantics (status='used', usedAt=now) but
  // scopes by business rather than by user, and wraps in a transaction
  // so the redeem + CampaignEvent insert happen atomically.
  app.post('/biz/qrscan', async (request): Promise<BizQrScanResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = bizQrScanSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const business = await requireBusinessOwner(userId);

    // The QR payload may be a raw claimCode (legacy) or a signed token
    // `${claimCode}.${hmac}` (post-HMAC rollout). verifySignedCode handles
    // both: returns the underlying claimCode for the DB lookup, and throws
    // 400 on a present-but-invalid signature (tamper detection).
    let claimCodeForLookup: string;
    try {
      claimCodeForLookup = verifySignedCode(parsed.data.claimCode).claimCode;
    } catch (err) {
      throw Errors.badRequest(err instanceof Error ? err.message : 'Invalid QR payload');
    }

    const reward = await prisma.userReward.findUnique({
      where: { claimCode: claimCodeForLookup },
      include: {
        offer: { select: { id: true, title: true, businessId: true } },
        user: { select: { id: true, username: true } },
      },
    });
    // 404 covers both "no row" and "belongs to another business" so we
    // don't leak the existence of foreign claim codes.
    if (!reward || reward.offer.businessId !== business.id) {
      throw Errors.notFound('Reward');
    }
    if (reward.status !== 'active') {
      throw Errors.conflict('Reward is not active');
    }

    // If this offer is wired to an active campaign, the visit event keeps
    // costPerVisit on the dashboard honest. Fetch outside the txn so we
    // know whether to write the event before opening it.
    const campaign = await prisma.campaign.findFirst({
      where: { businessId: business.id, offerId: reward.offer.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.userReward.update({
        where: { id: reward.id },
        data: { status: 'used', usedAt: new Date() },
      });
      const event = campaign
        ? await tx.campaignEvent.create({
            data: { campaignId: campaign.id, userId: reward.userId, kind: 'visit' },
          })
        : null;
      return { reward: updated, eventId: event?.id ?? null };
    });

    return {
      reward: {
        id: result.reward.id,
        status: result.reward.status as 'active' | 'used' | 'expired',
        usedAt: result.reward.usedAt ? result.reward.usedAt.toISOString() : null,
        offerId: reward.offer.id,
        offerTitle: reward.offer.title,
        userId: reward.user.id,
        username: reward.user.username,
      },
      campaignEventId: result.eventId,
    };
  });

  // ---------- Onboarding (B6.1) ----------

  // POST /biz/onboarding/setup — creates a Business owned by the caller
  // if none exists yet, otherwise updates the existing one. The mobile
  // onboarding chain hits this first to land an owner on the rest of
  // the flow, so it can't be gated by requireBusinessOwner.
  app.post('/biz/onboarding/setup', async (request): Promise<BizOnboardingSetupResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = bizOnboardingSetupSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    const existing = await prisma.business.findFirst({ where: { ownerId: userId } });
    const business = existing
      ? await prisma.business.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            category: data.category,
            pincode: data.pincode,
            address: data.address ?? existing.address,
            phone: data.phone ?? existing.phone,
          },
        })
      : await prisma.business.create({
          data: {
            name: data.name,
            category: data.category,
            pincode: data.pincode,
            address: data.address ?? null,
            phone: data.phone ?? null,
            ownerId: userId,
          },
        });
    return { business: serializeBusiness(business) };
  });

  // POST /biz/onboarding/pincodes — persists the reach pincodes the
  // owner picks. Requires an existing business.
  app.post('/biz/onboarding/pincodes', async (request): Promise<BizOnboardingSetupResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = bizPincodesSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const business = await requireBusinessOwner(userId);
    const updated = await prisma.business.update({
      where: { id: business.id },
      data: { targetPincodes: parsed.data.pincodes },
    });
    return { business: serializeBusiness(updated) };
  });

  // POST /biz/onboarding/plan — upserts the BusinessPlan tier.
  // Tier defaults: Starter (₹500 cap, 1 pincode), Growth (₹5K, 5),
  // Pro (₹12K, 20). The mobile screen shows the user the same numbers.
  app.post('/biz/onboarding/plan', async (request): Promise<BizPlanResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = bizPlanSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const business = await requireBusinessOwner(userId);

    const tierDefaults: Record<BizPlanTier, { monthlyCapAmount: number; pincodeCap: number }> = {
      starter: { monthlyCapAmount: 500, pincodeCap: 1 },
      growth: { monthlyCapAmount: 5000, pincodeCap: 5 },
      pro: { monthlyCapAmount: 12000, pincodeCap: 20 },
    };
    const def = tierDefaults[parsed.data.tier];

    const plan = await prisma.businessPlan.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        tier: parsed.data.tier,
        monthlyCapAmount: def.monthlyCapAmount,
        pincodeCap: def.pincodeCap,
      },
      update: {
        tier: parsed.data.tier,
        monthlyCapAmount: def.monthlyCapAmount,
        pincodeCap: def.pincodeCap,
      },
    });

    return {
      tier: plan.tier,
      monthlyCapAmount: asNumber(plan.monthlyCapAmount),
      pincodeCap: plan.pincodeCap,
      startedAt: plan.startedAt.toISOString(),
    };
  });

  // POST /biz/onboarding/payment — mock top-up. Writes a positive
  // BusinessTransaction credit; no real gateway is wired yet. The
  // dashboard's billing screen sums these against debits to show balance.
  app.post('/biz/onboarding/payment', async (request): Promise<BizPaymentResponse> => {
    const userId = request.userId;
    if (!userId) throw Errors.unauthorized('Authentication required');
    const parsed = bizPaymentSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const business = await requireBusinessOwner(userId);

    const tx = await prisma.businessTransaction.create({
      data: {
        businessId: business.id,
        amount: parsed.data.amount,
        kind: 'topup',
        note: 'mock topup',
      },
    });
    const newBalance = await getBalance(business.id);
    return {
      transactionId: tx.id,
      amount: asNumber(tx.amount),
      newBalance,
    };
  });
}
