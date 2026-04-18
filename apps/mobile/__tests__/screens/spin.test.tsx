import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SpinScreen from '@/app/spin/index';
import { spinService } from '@/services/spinService';

jest.mock('@/services/spinService');
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: { getState: () => ({ refreshSummary: jest.fn() }) },
}));

describe('<SpinScreen />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the spin wheel when canSpin=true', async () => {
    (spinService.status as jest.Mock).mockResolvedValue({ canSpin: true });
    const { findByTestId } = render(<SpinScreen />);
    expect(await findByTestId('spin-wheel')).toBeTruthy();
  });

  it('shows "Come back tomorrow" when canSpin is false', async () => {
    (spinService.status as jest.Mock).mockResolvedValue({ canSpin: false });
    const { findByText } = render(<SpinScreen />);
    expect(await findByText(/come back tomorrow/i)).toBeTruthy();
  });

  it('calls spinService.spin and shows result on tap', async () => {
    (spinService.status as jest.Mock).mockResolvedValue({ canSpin: true });
    (spinService.spin as jest.Mock).mockResolvedValue({ pointsAwarded: 27 });
    const { findByText } = render(<SpinScreen />);
    fireEvent.press(await findByText(/spin now/i));
    expect(await findByText(/27/)).toBeTruthy();
  });
});
