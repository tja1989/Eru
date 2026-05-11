/**
 * Biz onboarding chain (BD B6.2) — five screens. One file covers each
 * screen's submit + service-call + navigation assertions to keep the
 * test set focused.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: {
    onboardingSetup: jest.fn(),
    onboardingPincodes: jest.fn(),
    onboardingPlan: jest.fn(),
    onboardingPayment: jest.fn(),
  },
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

jest.mock('@/components/biz/PincodeMultiSelect', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    PincodeMultiSelect: ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
      <TouchableOpacity testID="stub-pincode-add" onPress={() => onChange([...value, '682016'])}>
        <Text>Add</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@/constants/theme', () => ({
  colors: {
    bg: '#fff', card: '#fff', g100: '#eee', g200: '#ddd', g400: '#888',
    g500: '#777', g600: '#555', g700: '#333', g800: '#222', orange: '#f60',
    navy: '#123', green: '#0a0', red: '#a00', blue: '#00f',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
}));

import { bizService } from '@/services/bizService';
import Welcome from '@/app/(biz)/onboarding/welcome';
import BizInfo from '@/app/(biz)/onboarding/bizinfo';
import Pincodes from '@/app/(biz)/onboarding/pincodes';
import Plans from '@/app/(biz)/onboarding/plans';
import Payment from '@/app/(biz)/onboarding/payment';

const mockedSetup = bizService.onboardingSetup as jest.MockedFunction<typeof bizService.onboardingSetup>;
const mockedPin = bizService.onboardingPincodes as jest.MockedFunction<typeof bizService.onboardingPincodes>;
const mockedPlan = bizService.onboardingPlan as jest.MockedFunction<typeof bizService.onboardingPlan>;
const mockedPay = bizService.onboardingPayment as jest.MockedFunction<typeof bizService.onboardingPayment>;

const business = {
  id: 'b-1', name: 'X', category: 'cafe', pincode: '682016',
  address: null, phone: null, avatarUrl: null, bannerUrl: null,
  isVerified: false, targetPincodes: [], followerCount: 0, rating: 0,
  reviewCount: 0, createdAt: new Date().toISOString(),
};

beforeEach(() => {
  mockedSetup.mockReset();
  mockedPin.mockReset();
  mockedPlan.mockReset();
  mockedPay.mockReset();
  mockPush.mockReset();
  mockReplace.mockReset();
});

describe('onboarding/welcome', () => {
  it('Get Started routes to bizinfo', () => {
    const { getByText } = render(<Welcome />);
    fireEvent.press(getByText(/Get Started/i));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/(biz)/onboarding/bizinfo'));
  });
});

describe('onboarding/bizinfo', () => {
  it('submits the form and routes to pincodes', async () => {
    mockedSetup.mockResolvedValueOnce({ business: { ...business, name: 'Test Cafe' } });
    const { getByPlaceholderText, getByText } = render(<BizInfo />);
    fireEvent.changeText(getByPlaceholderText(/Business name/i), 'Test Cafe');
    fireEvent.changeText(getByPlaceholderText(/Category/i), 'cafe');
    fireEvent.changeText(getByPlaceholderText(/Primary pincode/i), '682016');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(mockedSetup).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Cafe', category: 'cafe', pincode: '682016',
      }));
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/(biz)/onboarding/pincodes'));
    });
  });
});

describe('onboarding/pincodes', () => {
  it('posts the picked pincodes and routes to plans', async () => {
    mockedPin.mockResolvedValueOnce({ business });
    const { getByTestId, getByText } = render(<Pincodes />);
    fireEvent.press(getByTestId('stub-pincode-add'));
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(mockedPin).toHaveBeenCalledWith(['682016']);
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/(biz)/onboarding/plans'));
    });
  });
});

describe('onboarding/plans', () => {
  it('selects a tier and routes to payment', async () => {
    mockedPlan.mockResolvedValueOnce({
      tier: 'growth', monthlyCapAmount: 5000, pincodeCap: 5, startedAt: new Date().toISOString(),
    });
    const { getByText } = render(<Plans />);
    fireEvent.press(getByText(/Growth/i));
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(mockedPlan).toHaveBeenCalledWith('growth');
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/(biz)/onboarding/payment'));
    });
  });
});

describe('onboarding/payment', () => {
  it('tops up and redirects to the overview', async () => {
    mockedPay.mockResolvedValueOnce({ transactionId: 't1', amount: 1000, newBalance: 1000 });
    const { getByPlaceholderText, getByText } = render(<Payment />);
    fireEvent.changeText(getByPlaceholderText(/Amount/i), '1000');
    fireEvent.press(getByText('Top up'));

    await waitFor(() => {
      expect(mockedPay).toHaveBeenCalledWith(1000);
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/(biz)/overview'));
    });
  });
});
