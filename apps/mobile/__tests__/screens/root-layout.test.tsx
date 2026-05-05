/**
 * Tests for the onboarding gate in (auth)/_layout.tsx.
 *
 * The root _layout.tsx is intentionally "dumb" (no redirects) to avoid a
 * race condition with expo-router.  All auth + onboarding routing lives in
 * (auth)/_layout.tsx via declarative <Redirect> components, which is where
 * we add the onboarding gate.
 *
 * The useAuth hook exposes `hasCompletedOnboarding` alongside the existing
 * `isAuthenticated` and `initializing` values.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import AuthLayout from '@/app/(auth)/_layout';

// ---------------------------------------------------------------------------
// Mock expo-router — Redirect just renders a plain text node so we can assert
// which route it points to, and Stack renders its children transparently.
// useSegments is mocked per-test so we can simulate "currently on /welcome"
// vs "currently on /login" to catch redirect-loop regressions.
// ---------------------------------------------------------------------------
const mockRedirect = jest.fn();
let mockSegments: string[] = [];
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  function Redirect({ href }: { href: string }) {
    mockRedirect(href);
    return <Text testID="redirect">{href}</Text>;
  }

  function Stack({ children }: { children?: React.ReactNode }) {
    return <View testID="stack">{children}</View>;
  }
  Stack.Screen = function StackScreen() {
    return null;
  };

  return {
    Redirect,
    Stack,
    useSegments: () => mockSegments,
  };
});

// ---------------------------------------------------------------------------
// Mock useAuth hook — each test overrides this per-scenario.
// ---------------------------------------------------------------------------
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// ---------------------------------------------------------------------------
// Mock theme so StyleSheet.create doesn't crash in the test environment.
// ---------------------------------------------------------------------------
jest.mock('@/constants/theme', () => ({
  colors: { g400: '#888', bg: '#fff' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type AuthState = {
  initializing: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  needsHandleChoice?: boolean;
};

function setup(state: AuthState, segments: string[] = ['(auth)', 'login']) {
  mockedUseAuth.mockReturnValue({ needsHandleChoice: false, ...state });
  mockSegments = segments;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('<AuthLayout /> — onboarding gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading spinner while the store is hydrating', () => {
    setup({ initializing: true, isAuthenticated: false, hasCompletedOnboarding: false });
    const { queryByTestId } = render(<AuthLayout />);
    expect(queryByTestId('redirect')).toBeNull();
    expect(queryByTestId('stack')).toBeNull();
  });

  it('unauthenticated + !hasCompletedOnboarding on /login → renders Stack (login IS an onboarding route)', () => {
    setup({ initializing: false, isAuthenticated: false, hasCompletedOnboarding: false }, ['(auth)', 'login']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('stack')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('unauthenticated + !hasCompletedOnboarding on a non-onboarding route → redirects to /(auth)/welcome', () => {
    setup({ initializing: false, isAuthenticated: false, hasCompletedOnboarding: false }, ['(tabs)', 'profile']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('redirect').props.children).toBe('/(auth)/welcome');
    expect(mockRedirect).toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('unauthenticated + !hasCompletedOnboarding already on /welcome → renders Stack (no redirect loop)', () => {
    setup({ initializing: false, isAuthenticated: false, hasCompletedOnboarding: false }, ['(auth)', 'welcome']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('stack')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('unauthenticated + !hasCompletedOnboarding on /personalize → renders Stack (no redirect)', () => {
    setup({ initializing: false, isAuthenticated: false, hasCompletedOnboarding: false }, ['(auth)', 'personalize']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('stack')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('unauthenticated + !hasCompletedOnboarding on /tutorial → renders Stack (no redirect)', () => {
    setup({ initializing: false, isAuthenticated: false, hasCompletedOnboarding: false }, ['(auth)', 'tutorial']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('stack')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('unauthenticated + hasCompletedOnboarding on /login → renders Stack (no redirect)', () => {
    setup({ initializing: false, isAuthenticated: false, hasCompletedOnboarding: true }, ['(auth)', 'login']);
    const { getByTestId, queryByText } = render(<AuthLayout />);
    expect(getByTestId('stack')).toBeTruthy();
    expect(queryByText('/(auth)/welcome')).toBeNull();
    expect(mockRedirect).not.toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('authenticated + hasCompletedOnboarding → redirects to /(tabs)', () => {
    setup({ initializing: false, isAuthenticated: true, hasCompletedOnboarding: true }, ['(auth)', 'login']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('redirect').props.children).toBe('/(tabs)');
    expect(mockRedirect).not.toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('authenticated + !hasCompletedOnboarding on /login → renders Stack (login is an onboarding route)', () => {
    // Edge case: a user who has a token but somehow ended up on /login. The gate
    // lets them stay on /login rather than bouncing to tutorial — in practice
    // this can't happen because post-login flow routes forward, but verifying
    // the invariant prevents regression loops.
    setup({ initializing: false, isAuthenticated: true, hasCompletedOnboarding: false }, ['(auth)', 'login']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('stack')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalledWith('/(tabs)');
    expect(mockRedirect).not.toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('authenticated + !hasCompletedOnboarding on a non-onboarding route → redirects to /(auth)/tutorial', () => {
    setup({ initializing: false, isAuthenticated: true, hasCompletedOnboarding: false }, ['(tabs)', 'index']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('redirect').props.children).toBe('/(auth)/tutorial');
    expect(mockRedirect).toHaveBeenCalledWith('/(auth)/tutorial');
  });

  it('authenticated + !hasCompletedOnboarding already on /tutorial → renders Stack (no redirect loop)', () => {
    setup({ initializing: false, isAuthenticated: true, hasCompletedOnboarding: false }, ['(auth)', 'tutorial']);
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('stack')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalledWith('/(auth)/tutorial');
  });
});
