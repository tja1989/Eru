import api from './api';

export const authService = {
  register: (data: { firebaseUid: string; phone: string; name: string; username: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
};
