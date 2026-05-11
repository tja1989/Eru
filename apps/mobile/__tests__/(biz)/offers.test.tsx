/**
 * Offers screen — list + create flow.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { getOffers: jest.fn(), createOffer: jest.fn(), updateOffer: jest.fn() },
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

import { bizService } from '@/services/bizService';
import BizOffersOwner from '@/app/(biz)/offers';

const mockedGet = bizService.getOffers as jest.MockedFunction<typeof bizService.getOffers>;
const mockedCreate = bizService.createOffer as jest.MockedFunction<typeof bizService.createOffer>;

const offer = {
  id: 'o1', type: 'local' as const, title: 'Free coffee', description: null, imageUrl: null,
  pointsCost: 100, cashValue: 50, stock: null, perUserLimit: 1,
  validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 86400_000).toISOString(),
  isActive: true, createdAt: new Date().toISOString(),
};

describe('(biz)/offers', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedCreate.mockReset();
  });

  it('renders existing offers from the service', async () => {
    mockedGet.mockResolvedValueOnce({ items: [offer] });
    const { findByText } = render(<BizOffersOwner />);
    expect(await findByText('Free coffee')).toBeTruthy();
  });

  it('opens the create form and POSTs a new offer on submit', async () => {
    mockedGet.mockResolvedValueOnce({ items: [] });
    mockedCreate.mockResolvedValueOnce({ ...offer, id: 'o-new', title: '10% off' });
    mockedGet.mockResolvedValueOnce({ items: [{ ...offer, id: 'o-new', title: '10% off' }] });

    const { findByText, getByPlaceholderText, getByText } = render(<BizOffersOwner />);

    fireEvent.press(await findByText('+ New offer'));
    fireEvent.changeText(getByPlaceholderText(/Offer title/i), '10% off');
    fireEvent.changeText(getByPlaceholderText(/Points cost/i), '50');
    fireEvent.changeText(getByPlaceholderText(/Cash value/i), '25');
    fireEvent.press(getByText('Create'));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({
        title: '10% off',
        pointsCost: 50,
        cashValue: 25,
      }));
    });
  });
});
