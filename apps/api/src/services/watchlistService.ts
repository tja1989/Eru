import { prisma } from '../utils/prisma.js';
import type { WatchlistEntry, GetWatchlistResponse } from '@eru/shared';

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
};
