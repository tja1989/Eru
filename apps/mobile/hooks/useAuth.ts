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
  // True if the server told us the username is still a `pending_*` placeholder.
  // Drives the route gate that bounces the user back to Personalize.
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
