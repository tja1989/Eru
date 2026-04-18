import { offersService } from '@/services/offersService';
import api from '@/services/api';

describe('offersService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('list() calls GET /offers with type filter', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { offers: [], page: 1, limit: 20, total: 0 },
    });
    await offersService.list('giftcard');
    expect(api.get).toHaveBeenCalledWith('/offers', { params: { type: 'giftcard' } });
  });

  it('claim(id) POSTs to /offers/:id/claim', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { reward: { id: 'r1', claimCode: 'ERU-ABCD' } },
    });
    const reward = await offersService.claim('offer-1');
    expect(api.post).toHaveBeenCalledWith('/offers/offer-1/claim');
    expect(reward.claimCode).toBe('ERU-ABCD');
  });
});
