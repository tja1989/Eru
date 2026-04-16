import api from './api';

export const pointsService = {
  earn: (data: { actionType: string; contentId?: string; metadata?: Record<string, any> }) =>
    api.post('/actions/earn', data).then((r) => r.data),
};
