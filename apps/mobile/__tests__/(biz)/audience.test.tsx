/**
 * Audience screen — renders ageBuckets / topPincodes / topInterests rows.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { getAudience: jest.fn() },
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
import BizAudience from '@/app/(biz)/audience';

const mockedGet = bizService.getAudience as jest.MockedFunction<typeof bizService.getAudience>;

describe('(biz)/audience', () => {
  beforeEach(() => mockedGet.mockReset());

  it('shows loading indicator before data resolves', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<BizAudience />);
    expect(getByTestId('biz-audience-loading')).toBeTruthy();
  });

  it('renders breakdown rows once data resolves', async () => {
    mockedGet.mockResolvedValueOnce({
      ageBuckets: [{ label: '25-34', count: 12 }, { label: '18-24', count: 8 }],
      topPincodes: [{ label: '682016', count: 15 }],
      peakHours: Array(24).fill(0),
      topInterests: [{ label: 'coffee', count: 9 }],
    });
    const { findByText } = render(<BizAudience />);
    expect(await findByText('25-34')).toBeTruthy();
    expect(await findByText('12')).toBeTruthy();
    expect(await findByText('682016')).toBeTruthy();
    expect(await findByText('coffee')).toBeTruthy();
  });
});
