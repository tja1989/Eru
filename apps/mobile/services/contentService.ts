import api from './api';

export const contentService = {
  create: (data: { type: string; text?: string; mediaIds: string[]; hashtags: string[]; locationPincode?: string }) =>
    api.post('/content/create', data).then((r) => r.data),
  getById: (id: string) => api.get(`/content/${id}`).then((r) => r.data),
  resubmit: (id: string) => api.post(`/content/${id}/resubmit`).then((r) => r.data),
  appeal: (id: string) => api.post(`/content/${id}/appeal`).then((r) => r.data),
  like: (id: string) => api.post(`/posts/${id}/like`).then((r) => r.data),
  unlike: (id: string) => api.delete(`/posts/${id}/unlike`).then((r) => r.data),
  comment: (id: string, text: string, parentId?: string) =>
    api.post(`/posts/${id}/comments`, { text, parentId }).then((r) => r.data),
  getComments: (id: string, page = 1) =>
    api.get(`/posts/${id}/comments`, { params: { page } }).then((r) => r.data),
};
