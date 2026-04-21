import api from '@/services/api';
import { watchlistService } from '@/services/watchlistService';

describe('watchlistService', () => {
  beforeEach(() => jest.clearAllMocks());

  const sampleEntry = {
    id: 'w1',
    businessId: 'b1',
    businessName: 'Brew District',
    businessAvatarUrl: null,
    businessCategory: 'cafe',
    businessPincode: '682001',
    notifyOnOffers: true,
    activeOfferCount: 2,
    createdAt: '2026-04-21T10:00:00Z',
  };

  it('list() GETs /watchlist and returns GetWatchlistResponse', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { items: [sampleEntry], total: 1 } });
    const res = await watchlistService.list();
    expect(api.get).toHaveBeenCalledWith('/watchlist');
    expect(res.items[0].businessName).toBe('Brew District');
    expect(res.total).toBe(1);
  });

  it('add() POSTs { businessId } and returns the entry', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { entry: sampleEntry } });
    const entry = await watchlistService.add('b1');
    expect(api.post).toHaveBeenCalledWith('/watchlist', { businessId: 'b1' });
    expect(entry.businessName).toBe('Brew District');
  });

  it('remove() DELETEs /watchlist/:businessId', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ status: 204 });
    await watchlistService.remove('b1');
    expect(api.delete).toHaveBeenCalledWith('/watchlist/b1');
  });

  it('setNotify() PATCHes /watchlist/:businessId with notifyOnOffers', async () => {
    (api.patch as jest.Mock).mockResolvedValue({ data: { ok: true } });
    await watchlistService.setNotify('b1', false);
    expect(api.patch).toHaveBeenCalledWith('/watchlist/b1', { notifyOnOffers: false });
  });
});
