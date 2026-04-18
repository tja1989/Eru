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
// ---------------------------------------------------------------------------
const mockRedirect = jest.fn();
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

  return { Redirect, Stack };
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
};

function setup(state: AuthState) {
  mockedUseAuth.mockReturnValue(state);
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
    const { getByTestId, queryByTestId } = render(<AuthLayout />);
    // Spinner is present, neither redirect nor stack is shown
    expect(queryByTestId('redirect')).toBeNull();
    expect(queryByTestId('stack')).toBeNull();
  });

  it('unauthenticated + !hasCompletedOnboarding → redirects to /(auth)/welcome', () => {
    setup({ initializing: false, isAuthenticated: false, hasCompletedOnboarding: false });
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('redirect').props.children).toBe('/(auth)/welcome');
    expect(mockRedirect).toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('unauthenticated + hasCompletedOnboarding → does NOT redirect to /(auth)/welcome (shows Stack)', () => {
    setup({ initializing: false, isAuthenticated: false, hasCompletedOnboarding: true });
    const { getByTestId, queryByText } = render(<AuthLayout />);
    // Should render the Stack (login flow), not redirect to welcome
    expect(getByTestId('stack')).toBeTruthy();
    expect(queryByText('/(auth)/welcome')).toBeNull();
    expect(mockRedirect).not.toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('authenticated → redirects to /(tabs), NOT to /(auth)/welcome', () => {
    setup({ initializing: false, isAuthenticated: true, hasCompletedOnboarding: true });
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('redirect').props.children).toBe('/(tabs)');
    expect(mockRedirect).not.toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('authenticated + !hasCompletedOnboarding → redirects to /(auth)/tutorial, NOT /(tabs)', () => {
    setup({ initializing: false, isAuthenticated: true, hasCompletedOnboarding: false });
    const { getByTestId } = render(<AuthLayout />);
    expect(getByTestId('redirect').props.children).toBe('/(auth)/tutorial');
    expect(mockRedirect).not.toHaveBeenCalledWith('/(tabs)');
    expect(mockRedirect).not.toHaveBeenCalledWith('/(auth)/welcome');
  });
});
