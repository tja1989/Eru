import React from 'react';
import { render, act } from '@testing-library/react-native';

const mockUseNotifications = jest.fn();
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: mockUseNotifications,
}));

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  return { Slot: () => <View testID="slot" /> };
});

jest.mock('@/components/PointsToast', () => ({
  PointsToast: () => null,
}));

describe('Root layout defers useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call useNotifications synchronously at first render', () => {
    const RootLayout = require('@/app/_layout').default;
    render(<RootLayout />);
    expect(mockUseNotifications).not.toHaveBeenCalled();
  });

  it('calls useNotifications after the deferred timeout', () => {
    const RootLayout = require('@/app/_layout').default;
    render(<RootLayout />);
    expect(mockUseNotifications).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(mockUseNotifications).toHaveBeenCalledTimes(1);
  });
});
