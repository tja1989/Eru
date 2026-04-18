import api from '@/services/api';
import { spinService } from '@/services/spinService';

describe('spinService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('status() calls GET /spin/status and returns { canSpin }', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { canSpin: true } });
    const result = await spinService.status();
    expect(api.get).toHaveBeenCalledWith('/spin/status');
    expect(result).toEqual({ canSpin: true });
  });

  it('spin() POSTs /spin and returns { pointsAwarded }', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { pointsAwarded: 17 } });
    const result = await spinService.spin();
    expect(api.post).toHaveBeenCalledWith('/spin');
    expect(result).toEqual({ pointsAwarded: 17 });
  });
});
