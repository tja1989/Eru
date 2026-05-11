/**
 * UGC tab — owner sees content tagged to their business, can boost a row.
 *  - Loading state renders.
 *  - Resolved data renders newTags + activeSponsorships.
 *  - Boost CTA opens an amount prompt and calls bizService.boostUgc on confirm.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { getUgc: jest.fn(), boostUgc: jest.fn() },
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
import BizUgc from '@/app/(biz)/ugc';

const mockedGet = bizService.getUgc as jest.MockedFunction<typeof bizService.getUgc>;
const mockedBoost = bizService.boostUgc as jest.MockedFunction<typeof bizService.boostUgc>;

describe('(biz)/ugc', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedBoost.mockReset();
  });

  it('shows a loading indicator before data resolves', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<BizUgc />);
    expect(getByTestId('biz-ugc-loading')).toBeTruthy();
  });

  it('renders tagged content rows and stats once data resolves', async () => {
    mockedGet.mockResolvedValueOnce({
      stats: { tagged: 2, sponsored: 1, reachEstimate: 3500 },
      newTags: [
        { id: 'c1', authorId: 'u1', authorUsername: 'alice', authorAvatarUrl: null,
          text: 'Loved the coffee!', imageUrl: null, createdAt: new Date().toISOString(),
          isSponsored: false, sponsorshipId: null },
      ],
      activeSponsorships: [
        { id: 'c2', authorId: 'u2', authorUsername: 'bob', authorAvatarUrl: null,
          text: 'Premium experience.', imageUrl: null, createdAt: new Date().toISOString(),
          isSponsored: true, sponsorshipId: 's-1' },
      ],
    });

    const { findByText } = render(<BizUgc />);
    expect(await findByText('Loved the coffee!')).toBeTruthy();
    expect(await findByText('Premium experience.')).toBeTruthy();
    expect(await findByText(/alice/)).toBeTruthy();
    expect(await findByText(/bob/)).toBeTruthy();
  });

  it('Boost button calls bizService.boostUgc with the content id and amount', async () => {
    mockedGet.mockResolvedValueOnce({
      stats: { tagged: 1, sponsored: 0, reachEstimate: 0 },
      newTags: [
        { id: 'c-boost', authorId: 'u1', authorUsername: 'alice', authorAvatarUrl: null,
          text: 'Top notch', imageUrl: null, createdAt: new Date().toISOString(),
          isSponsored: false, sponsorshipId: null },
      ],
      activeSponsorships: [],
    });
    mockedBoost.mockResolvedValueOnce({ proposalId: 'p-1' });

    // Auto-confirm the Alert prompt with amount 500
    const spy = jest.spyOn(Alert, 'prompt').mockImplementation((_t, _m, buttons: any) => {
      const confirm = Array.isArray(buttons) ? buttons.find((b) => b.text === 'Boost') : null;
      confirm?.onPress?.('500');
    });

    const { findByText } = render(<BizUgc />);
    const boostBtn = await findByText('Boost');
    fireEvent.press(boostBtn);

    await waitFor(() => {
      expect(mockedBoost).toHaveBeenCalledWith('c-boost', 500);
    });
    spy.mockRestore();
  });
});
