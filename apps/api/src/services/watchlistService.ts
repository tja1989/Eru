import { prisma } from '../utils/prisma.js';
import type {
  WatchlistEntry,
  GetWatchlistResponse,
  WatchlistDealItem,
  WatchlistDealsResponse,
} from '@eru/shared';

type WatchlistRow = {
  id: string;
  businessId: string;
  notifyOnOffers: boolean;
  createdAt: Date;
  business: {
    name: string;
    avatarUrl: string | null;
    category: string;
    pincode: string;
    _count?: { offers: number };
  };
};

function shape(row: WatchlistRow): WatchlistEntry {
  return {
    id: row.id,
    businessId: row.businessId,
    businessName: row.business.name,
    businessAvatarUrl: row.business.avatarUrl,
    businessCategory: row.business.category,
    businessPincode: row.business.pincode,
    notifyOnOffers: row.notifyOnOffers,
    activeOfferCount: row.business._count?.offers ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export const watchlistService = {
  async add(userId: string, businessId: string): Promise<WatchlistEntry> {
    const row = await prisma.watchlist.upsert({
      where: { userId_businessId: { userId, businessId } },
      create: { userId, businessId },
      update: {},
      include: {
        business: {
          include: {
            _count: {
              select: {
                offers: {
                  where: { isActive: true, validUntil: { gt: new Date() } },
                },
              },
            },
          },
        },
      },
    });
    return shape(row as WatchlistRow);
  },

  async listForUser(userId: string): Promise<GetWatchlistResponse> {
    const rows = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          include: {
            _count: {
              select: {
                offers: {
                  where: { isActive: true, validUntil: { gt: new Date() } },
                },
              },
            },
          },
        },
      },
    });
    const items = rows.map((r) => shape(r as WatchlistRow));
    return { items, total: items.length };
  },

  async remove(userId: string, businessId: string): Promise<void> {
    await prisma.watchlist.delete({
      where: { userId_businessId: { userId, businessId } },
    });
  },

  async setNotifyPreference(userId: string, businessId: string, notify: boolean): Promise<void> {
    await prisma.watchlist.update({
      where: { userId_businessId: { userId, businessId } },
      data: { notifyOnOffers: notify },
    });
  },

  // Live deals from businesses the user follows. Narrowly scoped: active +
  // not-yet-expired only. No N+1 — one findMany joined on business.
  async listDealsForUser(userId: string): Promise<WatchlistDealsResponse> {
    const watched = await prisma.watchlist.findMany({
      where: { userId },
      select: { businessId: true },
    });
    if (watched.length === 0) return { items: [] };

    const businessIds = watched.map((w) => w.businessId);
    const now = new Date();
    const offers = await prisma.offer.findMany({
      where: {
        businessId: { in: businessIds },
        isActive: true,
        validUntil: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            category: true,
            pincode: true,
          },
        },
      },
    });

    const items: WatchlistDealItem[] = offers
      .filter((o) => o.business !== null)
      .map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        imageUrl: o.imageUrl,
        pointsCost: o.pointsCost,
        cashValue: Number(o.cashValue),
        expiresAt: o.validUntil.toISOString(),
        createdAt: o.createdAt.toISOString(),
        businessId: o.business!.id,
        businessName: o.business!.name,
        businessAvatarUrl: o.business!.avatarUrl,
        businessCategory: o.business!.category,
        businessPincode: o.business!.pincode,
      }));

    return { items };
  },
};
