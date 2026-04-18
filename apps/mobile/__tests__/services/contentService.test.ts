jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

import { contentService } from '@/services/contentService';
import api from '@/services/api';

describe('contentService.createComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POSTs to /posts/:id/comments with text', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { comment: { id: 'c1', text: 'hello', user: { username: 'me' } } },
    });

    const result = await contentService.createComment('post-id-1', 'hello');

    expect(api.post).toHaveBeenCalledWith('/posts/post-id-1/comments', { text: 'hello' });
    expect(result.id).toBe('c1');
    expect(result.text).toBe('hello');
  });

  it('passes parentId when replying', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { comment: { id: 'r1', text: 'reply', parentId: 'c1', user: { username: 'me' } } },
    });

    await contentService.createComment('post-id-1', 'reply', 'c1');

    expect(api.post).toHaveBeenCalledWith('/posts/post-id-1/comments', {
      text: 'reply',
      parentId: 'c1',
    });
  });

  it('throws if text is empty', async () => {
    await expect(contentService.createComment('post-id-1', '')).rejects.toThrow(
      'Comment cannot be empty',
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('contentService.report', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs to /content/:id/report with reason + notes', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { report: { id: 'r1' } } });
    await contentService.report('post-1', 'spam', 'repeated promo');
    expect(api.post).toHaveBeenCalledWith('/content/post-1/report', {
      reason: 'spam',
      notes: 'repeated promo',
    });
  });

  it('omits notes when not provided', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { report: { id: 'r1' } } });
    await contentService.report('post-1', 'harassment');
    expect(api.post).toHaveBeenCalledWith('/content/post-1/report', {
      reason: 'harassment',
    });
  });
});

describe('contentService.delete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls DELETE /content/:id', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
    await contentService.delete('post-1');
    expect(api.delete).toHaveBeenCalledWith('/content/post-1');
  });
});
