import api from './api';
import {
  getFirebaseAuth,
  PhoneAuthProvider,
  signInWithCredential,
} from './firebase';

export const authService = {
  register: (data: { firebaseUid: string; phone: string; name: string; username: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),

  // Exchanges a Firebase verificationId + SMS code for a signed-in Firebase
  // credential, then returns the Firebase ID token we send to our own API.
  async verifyOtpAndSignIn(verificationId: string, code: string): Promise<string> {
    const auth = getFirebaseAuth();
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const userCred = await signInWithCredential(auth, credential);
    return await userCred.user.getIdToken();
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
};
