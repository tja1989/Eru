import api from '@/services/api';

export type Highlight = {
  id: string;
  title: string;
  emoji: string;
  sortOrder: number;
  createdAt: string;
  itemCount?: number;
};

export type HighlightItem = {
  id: string;
  highlightId: string;
  contentId: string;
  sortOrder: number;
  content: {
    id: string;
    mediaUrl: string | null;
    type: string;
    caption?: string | null;
  };
};

export const highlightsService = {
  listForUser: async (userId: string): Promise<Highlight[]> => {
    const res = await api.get(`/users/${userId}/highlights`);
    return res.data.highlights;
  },

  create: async (data: { title: string; emoji: string; sortOrder?: number }): Promise<Highlight> => {
    const res = await api.post('/highlights', data);
    return res.data.highlight;
  },

  update: async (id: string, data: { title?: string; emoji?: string; sortOrder?: number }): Promise<Highlight> => {
    const res = await api.put(`/highlights/${id}`, data);
    return res.data.highlight;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/highlights/${id}`);
  },

  getHighlight: async (id: string): Promise<Highlight & { items: HighlightItem[] }> => {
    const res = await api.get(`/highlights/${id}`);
    return res.data.highlight;
  },

  addItem: async (highlightId: string, contentId: string): Promise<{ id: string; highlightId: string; contentId: string; sortOrder: number }> => {
    const res = await api.post(`/highlights/${highlightId}/items`, { contentId });
    return res.data.item;
  },

  removeItem: async (highlightId: string, itemId: string): Promise<void> => {
    await api.delete(`/highlights/${highlightId}/items/${itemId}`);
  },
};
