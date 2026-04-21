import { authService } from '@/services/authService';
import api from '@/services/api';

// `@/services/api` is globally mocked in jest.setup.ts. `@/services/firebase`
// is also globally mocked there. We rely on those defaults here.

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRegistered()', () => {
    it('calls GET /wallet/summary with the token; returns true on 200', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200, data: {} });
      const registered = await authService.checkRegistered('firebase-id-token-abc');
      expect(api.get).toHaveBeenCalledWith(
        '/wallet/summary',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer firebase-id-token-abc' }),
        }),
      );
      expect(registered).toBe(true);
    });

    it('returns false on 401', async () => {
      (api.get as jest.Mock).mockRejectedValue({ response: { status: 401 } });
      const registered = await authService.checkRegistered('firebase-id-token-abc');
      expect(registered).toBe(false);
    });
  });
});
