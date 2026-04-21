import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BusinessSearchResponse, StorefrontResponse } from '@eru/shared';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';

// "Open now" computed against IST (Asia/Kolkata) so Kerala-local storefronts
// render consistently regardless of server locale.
function isOpenNow(hours: unknown): boolean {
  if (!Array.isArray(hours)) return false;
  const now = new Date();
  // IST is UTC+05:30; day index 0=Sun.
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  const istDate = new Date(istMs);
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = dayKeys[istDate.getUTCDay()];
  const nowHHmm = `${String(istDate.getUTCHours()).padStart(2, '0')}:${String(istDate.getUTCMinutes()).padStart(2, '0')}`;
  const entry = (hours as Array<{ day: string; open: string; close: string }>).find((h) => h.day === today);
  if (!entry) return false;
  return entry.open <= nowHHmm && nowHHmm <= entry.close;
}

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'q is required'),
});

export async function businessRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Business search — fuzzy case-insensitive name match for the create-screen
  // "Tag a Business" autocomplete. Capped at 10 results to keep the dropdown
  // sane; the real "discover" flow (explore screen) uses a richer endpoint.
  app.get('/businesses/search', async (request): Promise<BusinessSearchResponse> => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }
    const { q } = parsed.data;

    const items = await prisma.business.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        pincode: true,
        avatarUrl: true,
      },
    });

    return { items };
  });

  app.get('/business/:id', async (request) => {
    const { id } = request.params as { id: string };
    const biz = await prisma.business.findUnique({
      where: { id },
      include: {
        offers: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!biz) throw Errors.notFound('Business');
    return { business: biz };
  });

  // GET /businesses/:id/storefront — one-shot aggregate for the storefront
  // screen: profile + active offers + top reviews + tagged UGC.
  app.get('/businesses/:id/storefront', async (request): Promise<StorefrontResponse> => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    // Run the 4 subqueries in parallel to keep latency predictable.
    const [biz, offers, reviews, tagged, watchRow] = await Promise.all([
      prisma.business.findUnique({ where: { id } }),
      prisma.offer.findMany({
        where: { businessId: id, isActive: true, validUntil: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Top reviews = Content rows where subtype='review' tagging this business,
      // ordered by likeCount DESC then recency.
      prisma.content.findMany({
        where: {
          businessTagId: id,
          subtype: 'review',
          moderationStatus: 'published',
          deletedAt: null,
        },
        orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      // Tagged UGC = any published content referencing this business, newest-first.
      prisma.content.findMany({
        where: {
          businessTagId: id,
          moderationStatus: 'published',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          media: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      }),
      prisma.watchlist.findUnique({
        where: { userId_businessId: { userId, businessId: id } },
      }),
    ]);

    if (!biz) throw Errors.notFound('Business');

    return {
      business: {
        id: biz.id,
        name: biz.name,
        verified: biz.isVerified,
        avatarUrl: biz.avatarUrl,
        bannerUrl: biz.bannerUrl,
        category: biz.category,
        pincode: biz.pincode,
        since: biz.since,
        description: biz.description,
        hours: Array.isArray(biz.openHours)
          ? (biz.openHours as Array<{ day: string; open: string; close: string }>)
          : [],
        phone: biz.phone,
        address: biz.address,
        ratingAvg: Number(biz.rating),
        ratingCount: biz.reviewCount,
        responseTimeMinutes: biz.responseTimeMinutes,
        followerCount: biz.followerCount,
        isFollowedByMe: watchRow !== null,
        openNow: isOpenNow(biz.openHours),
      },
      offers: offers.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        pointsCost: o.pointsCost,
        cashValue: Number(o.cashValue),
        imageUrl: o.imageUrl,
        expiresAt: o.validUntil.toISOString(),
      })),
      topReviews: reviews.map((r) => ({
        id: r.id,
        userId: r.userId,
        username: r.user.username,
        userAvatarUrl: r.user.avatarUrl,
        rating: null,
        body: r.text ?? '',
        createdAt: r.createdAt.toISOString(),
        isVerifiedEruCustomer: true,
      })),
      taggedContent: tagged.map((c) => ({
        id: c.id,
        thumbnailUrl: c.media[0]?.thumbnailUrl ?? c.media[0]?.originalUrl ?? null,
        mediaKind:
          c.type === 'reel'
            ? 'reel'
            : (c.media.length > 1
                ? 'carousel'
                : c.media[0]?.type === 'video'
                  ? 'video'
                  : 'photo') as 'photo' | 'video' | 'reel' | 'carousel',
        isTrending: c.isTrending,
        durationSeconds: c.media[0]?.durationSeconds ?? null,
      })),
    };
  });
}
