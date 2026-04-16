import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const [initializing, setInitializing] = useState(true);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // In production, this would check Firebase auth state
    // For dev/beta, just check Zustand store
    setInitializing(false);
  }, []);

  return { initializing, isAuthenticated };
}
