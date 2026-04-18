import { userService } from '@/services/userService';
import api from '@/services/api';

describe('userService.follow/unfollow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('follow(id) POSTs to /users/:id/follow', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    await userService.follow('user-123');
    expect(api.post).toHaveBeenCalledWith('/users/user-123/follow');
  });

  it('unfollow(id) DELETEs /users/:id/unfollow', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
    await userService.unfollow('user-123');
    expect(api.delete).toHaveBeenCalledWith('/users/user-123/unfollow');
  });
});

describe('userService.getMyContentSummary', () => {
  beforeEach(() => jest.clearAllMocks());
  it('calls GET /users/me/content-summary and returns the summary object', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { summary: { published: 5, pending: 1, declined: 0, totalLikes: 42 } },
    });
    const result = await userService.getMyContentSummary();
    expect(api.get).toHaveBeenCalledWith('/users/me/content-summary');
    expect(result.totalLikes).toBe(42);
  });
});
