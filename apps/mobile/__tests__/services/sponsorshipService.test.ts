import api from '@/services/api';
import { sponsorshipService } from '@/services/sponsorshipService';

describe('sponsorshipService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getDashboard() calls GET /sponsorship/dashboard and returns the payload', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        activeCount: 1,
        pendingCount: 2,
        completedCount: 3,
        totalEarnings: 1500,
        active: [],
        pending: [],
      },
    });
    const result = await sponsorshipService.getDashboard();
    expect(api.get).toHaveBeenCalledWith('/sponsorship/dashboard');
    expect(result.totalEarnings).toBe(1500);
    expect(result.pendingCount).toBe(2);
  });

  it('accept() POSTs /sponsorship/:id/accept and returns proposal', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { proposal: { id: 'p1', status: 'accepted' } } });
    const result = await sponsorshipService.accept('p1');
    expect(api.post).toHaveBeenCalledWith('/sponsorship/p1/accept');
    expect(result.id).toBe('p1');
  });

  it('decline() POSTs /sponsorship/:id/decline and returns proposal', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { proposal: { id: 'p2', status: 'declined' } } });
    const result = await sponsorshipService.decline('p2');
    expect(api.post).toHaveBeenCalledWith('/sponsorship/p2/decline');
    expect(result.id).toBe('p2');
  });
});
