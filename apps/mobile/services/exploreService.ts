import api from './api';

export const exploreService = {
  getExplore: (category = 'all', page = 1) =>
    api.get('/explore', { params: { category, page } }).then((r) => r.data),
  search: (q: string) => api.get('/search', { params: { q } }).then((r) => r.data),
  getTrending: () => api.get('/trending').then((r) => r.data),
};
