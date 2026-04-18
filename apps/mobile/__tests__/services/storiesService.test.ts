import api from '@/services/api';
import { storiesService } from '@/services/storiesService';

describe('storiesService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('feed() calls GET /stories and returns stories array', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        stories: [
          {
            id: 's1',
            userId: 'u1',
            mediaUrl: 'https://m/1.jpg',
            thumbnailUrl: null,
            isLive: false,
            createdAt: '2026-04-18T00:00:00Z',
            expiresAt: '2026-04-19T00:00:00Z',
            user: { id: 'u1', username: 'tj', avatarUrl: null },
            views: [],
          },
        ],
      },
    });
    const result = await storiesService.feed();
    expect(api.get).toHaveBeenCalledWith('/stories');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
  });

  it('markViewed() POSTs /stories/:id/view', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    await storiesService.markViewed('s1');
    expect(api.post).toHaveBeenCalledWith('/stories/s1/view');
  });

  it('post() POSTs /stories with mediaUrl + thumbnailUrl', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { story: { id: 's2', mediaUrl: 'https://m/2.jpg' } },
    });
    const s = await storiesService.post('https://m/2.jpg', 'https://m/2_thumb.jpg');
    expect(api.post).toHaveBeenCalledWith('/stories', {
      mediaUrl: 'https://m/2.jpg',
      thumbnailUrl: 'https://m/2_thumb.jpg',
    });
    expect(s.id).toBe('s2');
  });
});
