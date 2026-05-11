/**
 * Auth + onboarding gate for the (biz) tab group.
 *
 *  - unauthenticated → /(auth)/login
 *  - authenticated + no owned business → /(biz)/onboarding/welcome
 *  - authenticated + business present → render Tabs (the dashboard)
 *
 * Same testing strategy as the (auth)/_layout gate — mock expo-router,
 * useAuth, and bizService; assert the Redirect href or the rendered tab Slot.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  function Redirect({ href }: { href: string }) {
    mockRedirect(href);
    return <Text testID="redirect">{href}</Text>;
  }

  function Tabs({ children }: { children?: React.ReactNode }) {
    return <View testID="tabs">{children}</View>;
  }
  Tabs.Screen = function TabsScreen() {
    return null;
  };

  return { Redirect, Tabs };
});

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/bizService', () => ({
  bizService: {
    getMe: jest.fn(),
  },
}));

jest.mock('@/constants/theme', () => ({
  colors: {
    bg: '#fff',
    g200: '#eee',
    g400: '#888',
    g800: '#222',
    orange: '#f60',
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { useAuth } from '@/hooks/useAuth';
import { bizService } from '@/services/bizService';
import BizLayout from '@/app/(biz)/_layout';

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedGetMe = bizService.getMe as jest.MockedFunction<typeof bizService.getMe>;

describe('(biz)/_layout', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockedUseAuth.mockReset();
    mockedGetMe.mockReset();
  });

  it('redirects unauthenticated users to /(auth)/login', () => {
    mockedUseAuth.mockReturnValue({
      initializing: false,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      needsHandleChoice: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<BizLayout />);

    expect(mockRedirect).toHaveBeenCalledWith('/(auth)/login');
    expect(mockedGetMe).not.toHaveBeenCalled();
  });

  it('redirects authed users without an owned business to /(biz)/onboarding/welcome', async () => {
    mockedUseAuth.mockReturnValue({
      initializing: false,
      isAuthenticated: true,
      hasCompletedOnboarding: true,
      needsHandleChoice: false,
    } as unknown as ReturnType<typeof useAuth>);
    mockedGetMe.mockResolvedValue({ business: null });

    render(<BizLayout />);

    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith('/(biz)/onboarding/welcome');
    });
  });

  it('renders the tab layout when the authed user owns a business', async () => {
    mockedUseAuth.mockReturnValue({
      initializing: false,
      isAuthenticated: true,
      hasCompletedOnboarding: true,
      needsHandleChoice: false,
    } as unknown as ReturnType<typeof useAuth>);
    mockedGetMe.mockResolvedValue({
      business: {
        id: 'biz-1',
        name: 'Test Cafe',
        category: 'cafe',
        pincode: '682016',
        address: null,
        phone: null,
        avatarUrl: null,
        bannerUrl: null,
        isVerified: false,
        targetPincodes: [],
        followerCount: 0,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
      },
    });

    const { findByTestId } = render(<BizLayout />);
    await findByTestId('tabs');
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
