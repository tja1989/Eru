// Regression tests for the route-guard fail-safe. History: useAuth used to
// default `needsHandleChoice` to `true` whenever the user object was null or
// the field was missing. That choice produced an unkillable redirect loop
// across multiple call sites (boot rehydration race, edit-profile spread,
// partial OTP hydration). Four PRs (#9–#12) tried to fix the upstream sites;
// only flipping this default to `false` actually closed the loop class.
//
// These tests are the canary: if anyone reverts useAuth.ts to `?? true`,
// they fire immediately and explain why the change matters.

import { renderHook } from '@testing-library/react-native';
import { useAuth } from '@/hooks/useAuth';

let mockState: {
  user: { needsHandleChoice?: boolean } | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
} = { user: null, isAuthenticated: false, hasCompletedOnboarding: false };

jest.mock('@/stores/authStore', () => {
  const fn: any = (selector: (s: typeof mockState) => unknown) => selector(mockState);
  fn.persist = {
    hasHydrated: () => true,
    onFinishHydration: () => () => {},
  };
  return { useAuthStore: fn };
});

describe('useAuth — needsHandleChoice fail-safe', () => {
  beforeEach(() => {
    mockState = { user: null, isAuthenticated: false, hasCompletedOnboarding: false };
  });

  it('returns false when user is null (was true before 2026-05-06 — caused the redirect loop)', () => {
    mockState = { user: null, isAuthenticated: true, hasCompletedOnboarding: true };
    const { result } = renderHook(() => useAuth());
    // The whole point of the architectural fix: a null user must NOT
    // implicitly demand handle choice. Doing so traps authenticated users
    // in /(auth)/personalize on every navigation.
    expect(result.current.needsHandleChoice).toBe(false);
  });

  it('returns false when user exists but needsHandleChoice is undefined', () => {
    mockState = {
      user: {} as { needsHandleChoice?: boolean },
      isAuthenticated: true,
      hasCompletedOnboarding: true,
    };
    const { result } = renderHook(() => useAuth());
    // Spread-overwrite case: edit-profile sets the user object without the
    // field. The fail-safe must not turn that into a redirect.
    expect(result.current.needsHandleChoice).toBe(false);
  });

  it('returns true when user.needsHandleChoice is explicitly true', () => {
    mockState = {
      user: { needsHandleChoice: true },
      isAuthenticated: true,
      hasCompletedOnboarding: false,
    };
    const { result } = renderHook(() => useAuth());
    // Genuine handle-choice need still routes correctly. The fix did not
    // weaken the guard for users who legitimately need to pick a handle.
    expect(result.current.needsHandleChoice).toBe(true);
  });

  it('returns false when user.needsHandleChoice is explicitly false', () => {
    mockState = {
      user: { needsHandleChoice: false },
      isAuthenticated: true,
      hasCompletedOnboarding: true,
    };
    const { result } = renderHook(() => useAuth());
    expect(result.current.needsHandleChoice).toBe(false);
  });
});
