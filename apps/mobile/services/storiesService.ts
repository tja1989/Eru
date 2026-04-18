import api from '@/services/api';

export type Story = {
  id: string;
  userId: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  isLive: boolean;
  createdAt: string;
  expiresAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
  views: { id: string }[];
};

export const storiesService = {
  async feed(): Promise<Story[]> {
    const res = await api.get('/stories');
    return res.data.stories;
  },
  async markViewed(storyId: string) {
    await api.post(`/stories/${storyId}/view`);
  },
  async post(mediaUrl: string, thumbnailUrl?: string) {
    const res = await api.post('/stories', { mediaUrl, thumbnailUrl });
    return res.data.story;
  },
};
