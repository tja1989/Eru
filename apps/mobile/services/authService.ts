import api from './api';

export const authService = {
  register: (data: { firebaseUid: string; phone: string; name: string; username: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),

  // Silent first-time registration fired by the OTP screen the moment a
  // Firebase Phone Auth verification succeeds. The server generates its own
  // `pending_*` placeholder username regardless of what we send here, and
  // sets needsHandleChoice=true. The user picks their real handle on the
  // Personalize screen (PATCH /users/me with username clears the flag).
  // We still send a non-PII placeholder for the validator, but the value
  // never reaches the DB — defence in depth in case server logic changes.
  autoRegister: (firebaseUid: string, phone: string) => {
    const slug = firebaseUid.slice(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '0');
    return api.post('/auth/register', {
      firebaseUid,
      phone,
      name: 'New User',
      username: `pending_${slug}`,
    }).then((r) => r.data);
  },

  // Pings an authenticated endpoint to see whether the Firebase-verified user
  // already has a row in our DB. 200 → existing user, 401 → needs onboarding.
  // `skipAuthReset` tells the axios response interceptor to NOT treat our
  // intentional 401 as "session expired" (which would wipe the Zustand token
  // and loop the user back to /welcome). See services/api.ts for the flag.
  async checkRegistered(idToken: string): Promise<boolean> {
    try {
      await api.get('/wallet/summary', {
        headers: { Authorization: `Bearer ${idToken}` },
        skipAuthReset: true,
      } as any);
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
  // user has already claimed their welcome_bonus AND whether they're still
  // on a `pending_*` placeholder username. Used after login to decide
  // whether to skip the tutorial screen or route to it / Personalize.
  async getOnboardingStatus(): Promise<{ complete: boolean; needsHandleChoice: boolean }> {
    const res = await api.get('/users/me/onboarding-status');
    return res.data;
  },
};
