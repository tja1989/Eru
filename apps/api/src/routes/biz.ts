import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
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
  BizUgcContentItem,
  BizUgcResponse,
} from '@eru/shared';
import { sponsorshipService } from '../services/sponsorshipService.js';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';
import {
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
}
