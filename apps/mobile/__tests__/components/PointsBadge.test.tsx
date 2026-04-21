import React from 'react';
import { render } from '@testing-library/react-native';
import { PointsBadge } from '@/components/PointsBadge';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: () => ({ balance: 4820, streak: 24 }),
}));

describe('<PointsBadge />', () => {
  it('renders 🪙 + balance with thousands separator', () => {
    const { getByText } = render(<PointsBadge />);
    expect(getByText(/🪙/)).toBeTruthy();
    expect(getByText(/4,820/)).toBeTruthy();
  });

  it('renders 🔥 + streak when streak > 0', () => {
    const { getByText } = render(<PointsBadge />);
    expect(getByText(/🔥24/)).toBeTruthy();
  });
});
