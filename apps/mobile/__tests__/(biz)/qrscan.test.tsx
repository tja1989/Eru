/**
 * QR scan screen (B5.4 — manual claim-code entry). Asserts the entered
 * code is POSTed to /biz/qrscan and the redeemed reward is rendered.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { scanQr: jest.fn() },
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
import BizQrScan from '@/app/(biz)/qrscan';

const mockedScan = bizService.scanQr as jest.MockedFunction<typeof bizService.scanQr>;

describe('(biz)/qrscan', () => {
  beforeEach(() => mockedScan.mockReset());

  it('POSTs the entered code to the redeem endpoint and shows the result', async () => {
    mockedScan.mockResolvedValueOnce({
      reward: {
        id: 'r1', status: 'used', usedAt: new Date().toISOString(),
        offerId: 'o1', offerTitle: 'Free coffee',
        userId: 'u1', username: 'alice',
      },
      campaignEventId: null,
    });

    const { getByPlaceholderText, getByText, findByText } = render(<BizQrScan />);

    fireEvent.changeText(getByPlaceholderText(/CLAIM-CODE/i), 'TEST-CLAIM-1');
    fireEvent.press(getByText('Redeem'));

    await waitFor(() => {
      expect(mockedScan).toHaveBeenCalledWith('TEST-CLAIM-1');
    });
    expect(await findByText(/Free coffee/i)).toBeTruthy();
    expect(await findByText(/alice/i)).toBeTruthy();
  });
});
