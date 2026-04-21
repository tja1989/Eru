import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RedeemScreen from '@/app/redeem/index';
import { offersService } from '@/services/offersService';

jest.mock('@/services/offersService');
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: Object.assign(
    () => ({ balance: 4820, refreshSummary: jest.fn() }),
    { getState: () => ({ refreshSummary: jest.fn() }) },
  ),
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockQueryParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => mockQueryParams,
}));

describe('<RedeemScreen /> — PWA parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryParams = {};
    (offersService.list as jest.Mock).mockResolvedValue([]);
  });

  it('header reads "Rewards Store"', () => {
    const { getByText } = render(<RedeemScreen />);
    expect(getByText('Rewards Store')).toBeTruthy();
  });

  it('renders the balance pill (🪙 4,820)', () => {
    const { getByText } = render(<RedeemScreen />);
    expect(getByText(/🪙 4,820/)).toBeTruthy();
  });

  it('renders 6 category tabs in PWA order with exact labels', () => {
    const { getByText, getAllByText } = render(<RedeemScreen />);
    expect(getByText('🔥 All')).toBeTruthy();
    expect(getByText('🏪 Local')).toBeTruthy();
    // "🎁 Gift Cards", "📱 Recharge", "💝 Donate" also appear as section
    // titles when All tab is active, so use getAllByText to cover either.
    expect(getAllByText('🎁 Gift Cards').length).toBeGreaterThan(0);
    expect(getAllByText('📱 Recharge').length).toBeGreaterThan(0);
    expect(getAllByText('💝 Donate').length).toBeGreaterThan(0);
    expect(getByText('⭐ Premium')).toBeTruthy();
  });

  it('initial category comes from the ?type= query param', () => {
    mockQueryParams = { type: 'giftcard' };
    const { getByTestId } = render(<RedeemScreen />);
    expect(getByTestId('tab-giftcard').props.accessibilityState?.selected).toBe(true);
  });

  it('Gift Cards section renders a 6-tile grid when tab=giftcard', () => {
    mockQueryParams = { type: 'giftcard' };
    const { getAllByLabelText } = render(<RedeemScreen />);
    // 6 hardcoded brands: Amazon, Flipkart, Swiggy, BookMyShow, BigBasket, Myntra
    const tiles = getAllByLabelText(/gift card, from/i);
    expect(tiles).toHaveLength(6);
  });

  it('Recharge card shows when tab=recharge', () => {
    mockQueryParams = { type: 'recharge' };
    const { getByText, getAllByText } = render(<RedeemScreen />);
    // Tab label + section title both contain "Recharge" — the card itself
    // shows unique amount pills we can assert directly.
    expect(getAllByText(/Recharge/).length).toBeGreaterThan(0);
    expect(getByText('₹149')).toBeTruthy();
    expect(getByText('₹239')).toBeTruthy();
    expect(getByText('₹479')).toBeTruthy();
  });

  it('Donate tiles show when tab=donate', () => {
    mockQueryParams = { type: 'donate' };
    const { getByText } = render(<RedeemScreen />);
    expect(getByText('Plant a Tree')).toBeTruthy();
    expect(getByText('Books for Kids')).toBeTruthy();
    expect(getByText('Local Cause')).toBeTruthy();
    // All three show a match copy line
    expect(getByText(/Eru adds \+100 pts match/)).toBeTruthy();
  });

  it('tapping a tab switches categories', () => {
    const { getByText, getByTestId } = render(<RedeemScreen />);
    fireEvent.press(getByText('📱 Recharge'));
    expect(getByTestId('tab-recharge').props.accessibilityState?.selected).toBe(true);
  });
});
