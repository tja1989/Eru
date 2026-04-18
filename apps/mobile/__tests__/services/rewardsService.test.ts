import { rewardsService } from '@/services/rewardsService';
import api from '@/services/api';

describe('rewardsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('list() calls GET /rewards with status filter when provided', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { rewards: [{ id: 'r1', claimCode: 'ERU-AAAA' }] },
    });
    const result = await rewardsService.list('active');
    expect(api.get).toHaveBeenCalledWith('/rewards', { params: { status: 'active' } });
    expect(result[0].claimCode).toBe('ERU-AAAA');
  });

  it('markUsed(id) PUTs to /rewards/:id/use and returns the reward', async () => {
    (api.put as jest.Mock).mockResolvedValue({
      data: { reward: { id: 'r1', status: 'used' } },
    });
    const reward = await rewardsService.markUsed('r1');
    expect(api.put).toHaveBeenCalledWith('/rewards/r1/use');
    expect(reward.status).toBe('used');
  });
});
