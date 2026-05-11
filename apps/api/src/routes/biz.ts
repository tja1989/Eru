import type { FastifyInstance } from 'fastify';
import type { BizBusinessSummary, BizMeResponse } from '@eru/shared';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';

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
}
