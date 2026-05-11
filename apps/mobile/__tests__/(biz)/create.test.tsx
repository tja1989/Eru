/**
 * Create-Ad wizard scaffold (BD B3.1).
 *  - Step 1 (Content) renders on mount.
 *  - Next advances to Step 2 (Target) ONLY after required content fields filled.
 *  - Back from Step 2 returns to Step 1 with collected content preserved.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { createCampaign: jest.fn(), launchCampaign: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/components/biz/PincodeMultiSelect', () => ({
  PincodeMultiSelect: () => null,
}));

jest.mock('@/constants/theme', () => ({
  colors: {
    bg: '#fff', card: '#fff', g100: '#eee', g200: '#ddd', g400: '#888',
    g500: '#777', g600: '#555', g700: '#333', g800: '#222', orange: '#f60',
    navy: '#123', green: '#0a0', red: '#a00', blue: '#00f',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
}));

import BizCreate from '@/app/(biz)/create';

describe('(biz)/create', () => {
  it('renders Step 1 (Content) on mount', () => {
    const { getByPlaceholderText } = render(<BizCreate />);
    expect(getByPlaceholderText(/Catchy title/i)).toBeTruthy();
  });

  it('does NOT advance until required content fields are filled', () => {
    const { getByText, queryByText, getByPlaceholderText } = render(<BizCreate />);
    // No title typed → tapping Next should not show Step 2
    fireEvent.press(getByText('Next'));
    expect(queryByText(/Target your audience/i)).toBeNull();

    fireEvent.changeText(getByPlaceholderText(/Catchy title/i), 'Diwali Drive');
    fireEvent.press(getByText('Next'));
    expect(getByText(/Target your audience/i)).toBeTruthy();
  });

  it('Back from Step 2 returns to Step 1 with content state preserved', () => {
    const { getByText, getByPlaceholderText, getByDisplayValue } = render(<BizCreate />);
    fireEvent.changeText(getByPlaceholderText(/Catchy title/i), 'Holi Splash');
    fireEvent.press(getByText('Next'));
    expect(getByText(/Target your audience/i)).toBeTruthy();

    fireEvent.press(getByText('Back'));
    // Step 1 again, title input still has the value
    expect(getByDisplayValue('Holi Splash')).toBeTruthy();
  });
});
