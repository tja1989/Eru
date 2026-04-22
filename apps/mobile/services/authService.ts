import api from './api';

export const authService = {
  register: (data: { firebaseUid: string; phone: string; name: string; username: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),

  // Silent first-time registration fired by the OTP screen the moment a
  // Firebase Phone Auth verification succeeds. The defaults keep the user
  // from having to fill out a separate form (the PWA flow has no such form).
  // name/username can be edited later in Settings; username is derived from
  // the verified phone digits so it's unique by construction. The server's
  // /auth/register handler already treats a phone collision as "adopt the
  // existing row" (see apps/api/src/routes/auth.ts), which means a returning
  // user who half-registered earlier still gets reunited with their data.
  autoRegister: (firebaseUid: string, phone: string) => {
    const digits = phone.replace(/\D/g, '').slice(-10);
    return api.post('/auth/register', {
      firebaseUid,
      phone,
      name: 'New User',
      username: `user_${digits}`,
    }).then((r) => r.data);
  },

  // Pings an authenticated endpoint to see whether the Firebase-verified user
  // already has a row in our DB. 200 → existing user, 401 → needs onboarding.
  async checkRegistered(idToken: string): Promise<boolean> {
    try {
      await api.get('/wallet/summary', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      return true;
    } catch (err: any) {
      if (err?.response?.status === 401) return false;
      throw err;
    }
  },

  // POST /users/me/onboarding/complete — fired from the tutorial screen's
  // "Start Earning 🚀" CTA. Idempotent server-side: subsequent calls return 0.
  async completeOnboarding(): Promise<{ pointsCredited: number }> {
    const res = await api.post('/users/me/onboarding/complete');
    return res.data;
  },

  // GET /users/me/onboarding-status — server-truth check for whether this
  // user has already claimed their welcome_bonus. Used after login to decide
  // whether to skip the tutorial screen or route to it.
  async getOnboardingStatus(): Promise<{ complete: boolean }> {
    const res = await api.get('/users/me/onboarding-status');
    return res.data;
  },
};
