import api from './api';
import type { ContentSubtype } from '@eru/shared';

export const contentService = {
  create: (data: { type: string; subtype: ContentSubtype; text?: string; mediaIds: string[]; hashtags: string[]; locationPincode?: string; pollOptions?: string[]; threadParts?: string[]; taggedUserIds?: string[]; businessTagId?: string }) =>
    api.post('/content/create', data).then((r) => r.data),
  getThread: (id: string) => api.get(`/content/${id}/thread`).then((r) => r.data),
  getById: (id: string) => api.get(`/content/${id}`).then((r) => r.data),
  resubmit: (id: string) => api.post(`/content/${id}/resubmit`).then((r) => r.data),
  appeal: (id: string) => api.post(`/content/${id}/appeal`).then((r) => r.data),
  like: (id: string) => api.post(`/posts/${id}/like`).then((r) => r.data),
  unlike: (id: string) => api.delete(`/posts/${id}/unlike`).then((r) => r.data),
  dislike: (id: string) => api.post(`/posts/${id}/dislike`).then((r) => r.data),
  undislike: (id: string) => api.delete(`/posts/${id}/undislike`).then((r) => r.data),
  save: (id: string) => api.post(`/posts/${id}/save`).then((r) => r.data),
  unsave: (id: string) => api.delete(`/posts/${id}/unsave`).then((r) => r.data),
  comment: (id: string, text: string, parentId?: string) =>
    api.post(`/posts/${id}/comments`, { text, parentId }).then((r) => r.data),
  getComments: (id: string, page = 1) =>
    api.get(`/posts/${id}/comments`, { params: { page } }).then((r) => r.data),
  async createComment(contentId: string, text: string, parentId?: string) {
    if (!text.trim()) {
      throw new Error('Comment cannot be empty');
    }
    const payload: { text: string; parentId?: string } = { text };
    if (parentId) payload.parentId = parentId;
    const res = await api.post(`/posts/${contentId}/comments`, payload);
    return res.data.comment;
  },
  async report(contentId: string, reason: string, notes?: string) {
    const payload: { reason: string; notes?: string } = { reason };
    if (notes) payload.notes = notes;
    const res = await api.post(`/content/${contentId}/report`, payload);
    return res.data.report;
  },
  delete: async (contentId: string) => {
    await api.delete(`/content/${contentId}`);
  },
};
