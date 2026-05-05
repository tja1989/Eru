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
  // Default to true so a partial-onboarding crash (token persisted before
  // user record fully populated) bounces the user back to Personalize
  // rather than letting them slip into the tabs with no handle. The flag
  // gets cleared the moment they pick a real handle.
  const needsHandleChoice = useAuthStore((s) => s.user?.needsHandleChoice ?? true);

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
