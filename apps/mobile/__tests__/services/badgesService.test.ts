import api from '@/services/api';
import { badgesService } from '@/services/badgesService';

describe('badgesService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('list() calls GET /badges and returns badges array', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        badges: [
          { id: 'b1', code: 'a', title: 'A', description: '', emoji: '🎯', unlockedAt: null },
        ],
      },
    });
    const result = await badgesService.list();
    expect(api.get).toHaveBeenCalledWith('/badges');
    expect(result).toHaveLength(1);
  });

  it('check() POSTs /badges/check', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    await badgesService.check();
    expect(api.post).toHaveBeenCalledWith('/badges/check');
  });
});
