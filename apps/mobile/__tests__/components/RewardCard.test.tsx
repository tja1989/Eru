import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RewardCard } from '@/components/RewardCard';
import type { Reward } from '@/services/rewardsService';

const sampleReward: Reward = {
  id: 'r1',
  claimCode: 'ERU-AB12',
  status: 'active',
  pointsSpent: 100,
  expiresAt: '2030-01-01T00:00:00Z',
  offer: {
    id: 'o1',
    type: 'giftcard',
    title: 'Amazon gift card',
    pointsCost: 100,
    cashValue: 10,
    validUntil: '2030-01-01T00:00:00Z',
    business: null,
  },
};

describe('<RewardCard />', () => {
  it('renders the claim code as a QR code', () => {
    const { getByTestId } = render(<RewardCard reward={sampleReward} onUse={jest.fn()} />);
    expect(getByTestId('reward-qr')).toBeTruthy();
  });

  it('shows "ACTIVE" badge for active rewards', () => {
    const { getByText } = render(
      <RewardCard reward={{ ...sampleReward, status: 'active' }} onUse={jest.fn()} />,
    );
    expect(getByText(/active/i)).toBeTruthy();
  });

  it('calls onUse(id) when "Use at store" pressed', () => {
    const onUse = jest.fn();
    const { getByText } = render(<RewardCard reward={sampleReward} onUse={onUse} />);
    fireEvent.press(getByText(/use at store/i));
    expect(onUse).toHaveBeenCalledWith(sampleReward.id);
  });

  it('renders the server-side SVG when reward.qrSvg is present (testID=reward-qr-server)', () => {
    const withSvg: Reward = {
      ...sampleReward,
      qrSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#000"/></svg>',
    };
    const { getByTestId, queryByTestId } = render(<RewardCard reward={withSvg} onUse={jest.fn()} />);
    expect(getByTestId('reward-qr-server')).toBeTruthy();
    expect(queryByTestId('reward-qr-client')).toBeNull();
  });

  it('falls back to client-side QRCode when reward.qrSvg is missing (testID=reward-qr-client)', () => {
    const { getByTestId, queryByTestId } = render(<RewardCard reward={sampleReward} onUse={jest.fn()} />);
    expect(getByTestId('reward-qr-client')).toBeTruthy();
    expect(queryByTestId('reward-qr-server')).toBeNull();
  });
});
