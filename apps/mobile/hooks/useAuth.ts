import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  // Don't flip `initializing` off until the persisted auth state has been
  // rehydrated from AsyncStorage — otherwise the root layout will redirect
  // a signed-in user to /login before their token finishes loading.
  const [initializing, setInitializing] = useState(
    !useAuthStore.persist.hasHydrated(),
  );
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  // History note (2026-05-06): this used to default to `true`. The intent
  // was protective — catch a partial-onboarding crash where the token
  // persists but the user record didn't fully populate, and bounce the
  // user back to Personalize rather than into Tabs with no handle.
  //
  // That well-meaning default produced an unkillable loop class. Any code
  // path that left `s.user` null or `needsHandleChoice` undefined for even
  // one render — boot rehydration race, edit-profile spread, partial OTP
  // hydration on stale APK bundles — turned into a redirect to Personalize.
  // After four PRs (#9–#12) trying to keep the flag accurate at every
  // write site, the only architecturally clean fix is to stop trapping
  // users on a transient unknown. The server still enforces real-handle
  // requirements at the action level (POST /content, etc.), so a brief
  // false-negative is harmless; a false-positive locks the user out.
  const needsHandleChoice = useAuthStore((s) => s.user?.needsHandleChoice ?? false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setInitializing(false);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setInitializing(false);
    });
    return unsub;
  }, []);

  return { initializing, isAuthenticated, hasCompletedOnboarding, needsHandleChoice };
}
