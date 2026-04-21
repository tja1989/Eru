import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WatchlistStoresRow } from '@/components/WatchlistStoresRow';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const stores = [
  { businessId: 'b1', businessName: 'Kashi Bakes', businessAvatarUrl: null, businessCategory: 'bakery', activeOfferCount: 3 },
  { businessId: 'b2', businessName: 'Brew District', businessAvatarUrl: null, businessCategory: 'cafe', activeOfferCount: 0 },
];

describe('<WatchlistStoresRow />', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders a tile per watched store', () => {
    const { getByText } = render(<WatchlistStoresRow stores={stores as any} />);
    expect(getByText('Kashi Bakes')).toBeTruthy();
    expect(getByText('Brew District')).toBeTruthy();
  });

  it('renders an unread-offer-count dot only when activeOfferCount > 0', () => {
    const { getByLabelText, queryByLabelText } = render(<WatchlistStoresRow stores={stores as any} />);
    expect(getByLabelText('Kashi Bakes has 3 active offers')).toBeTruthy();
    expect(queryByLabelText(/Brew District has .* active offers/)).toBeNull();
  });

  it('tapping a store tile routes to /business/:id', () => {
    const { getByText } = render(<WatchlistStoresRow stores={stores as any} />);
    fireEvent.press(getByText('Kashi Bakes'));
    expect(mockPush).toHaveBeenCalledWith('/business/b1');
  });

  it('returns null when there are no stores', () => {
    const { UNSAFE_root } = render(<WatchlistStoresRow stores={[]} />);
    expect(UNSAFE_root.children.length).toBe(0);
  });
});
