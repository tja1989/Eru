import React from 'react';
import { render } from '@testing-library/react-native';
import Storefront from '@/app/business/[id]/index';
import { businessService } from '@/services/businessService';

jest.mock('@/services/businessService');
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'b1' }),
}));

describe('<Storefront />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (businessService.get as jest.Mock).mockResolvedValue({
      id: 'b1',
      name: 'Kashi Bakes',
      category: 'Bakery',
      rating: '4.7',
      reviewCount: 287,
      pincode: '682016',
      address: 'MG Road',
      phone: '+919843215678',
      isVerified: true,
      offers: [
        { id: 'o1', title: '20% off cakes', pointsCost: 200 },
      ],
    });
  });

  it('renders business name and rating', async () => {
    const { findByText } = render(<Storefront />);
    expect(await findByText('Kashi Bakes')).toBeTruthy();
    expect(await findByText(/4\.7/)).toBeTruthy();
    expect(await findByText(/287 reviews/i)).toBeTruthy();
  });

  it('renders offers under the Offers tab', async () => {
    const { findByText } = render(<Storefront />);
    expect(await findByText('20% off cakes')).toBeTruthy();
  });

  it('renders follow button', async () => {
    const { findByText } = render(<Storefront />);
    expect(await findByText(/follow & get offers/i)).toBeTruthy();
  });
});
