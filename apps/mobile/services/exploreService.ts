import api from './api';
import type { PaginatedResponse, SearchResponse, TrendingResponse } from '@eru/shared';

export const exploreService = {
  getExplore: <T = unknown>(
    category = 'all',
    page = 1,
  ): Promise<PaginatedResponse<T>> =>
    api.get('/explore', { params: { category, page } }).then((r) => r.data),
  search: (q: string): Promise<SearchResponse> =>
    api.get('/search', { params: { q } }).then((r) => r.data),
  getTrending: (): Promise<TrendingResponse> =>
    api.get('/trending').then((r) => r.data),
};
