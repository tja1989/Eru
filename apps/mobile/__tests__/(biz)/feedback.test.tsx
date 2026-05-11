/**
 * Feedback tab — owner sees reviews on their content, filters by sentiment,
 * and can reply inline.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { getFeedback: jest.fn(), replyFeedback: jest.fn() },
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
import BizFeedback from '@/app/(biz)/feedback';

const mockedGet = bizService.getFeedback as jest.MockedFunction<typeof bizService.getFeedback>;
const mockedReply = bizService.replyFeedback as jest.MockedFunction<typeof bizService.replyFeedback>;

const baseItem = (overrides: Partial<{ contentId: string; text: string; sentiment: 'positive' | 'neutral' | 'negative' }>) => ({
  contentId: overrides.contentId ?? 'c-1',
  authorId: 'u-1',
  authorUsername: 'alice',
  authorAvatarUrl: null,
  text: overrides.text ?? 'Decent place',
  rating: null,
  sentiment: overrides.sentiment ?? 'neutral' as const,
  createdAt: new Date().toISOString(),
  reply: null,
});

describe('(biz)/feedback', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedReply.mockReset();
  });

  it('shows a loading indicator before data resolves', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<BizFeedback />);
    expect(getByTestId('biz-feedback-loading')).toBeTruthy();
  });

  it('renders feedback rows and switching sentiment tab refetches with the filter', async () => {
    mockedGet.mockResolvedValueOnce({
      items: [
        baseItem({ contentId: 'c1', text: 'Loved it', sentiment: 'positive' }),
        baseItem({ contentId: 'c2', text: 'Mediocre', sentiment: 'neutral' }),
      ],
    });
    const { findByText, getByText } = render(<BizFeedback />);

    expect(await findByText('Loved it')).toBeTruthy();
    expect(await findByText('Mediocre')).toBeTruthy();
    expect(mockedGet).toHaveBeenLastCalledWith(undefined);

    mockedGet.mockResolvedValueOnce({
      items: [baseItem({ contentId: 'c1', text: 'Loved it', sentiment: 'positive' })],
    });
    fireEvent.press(getByText('Positive'));
    await waitFor(() => expect(mockedGet).toHaveBeenLastCalledWith('positive'));
  });

  it('Reply input calls bizService.replyFeedback with the right contentId', async () => {
    mockedGet.mockResolvedValueOnce({
      items: [baseItem({ contentId: 'c-reply', text: 'Could improve' })],
    });
    mockedReply.mockResolvedValueOnce({ reply: { text: 'Thanks for the input', createdAt: new Date().toISOString() } });

    const { findByTestId, findByText } = render(<BizFeedback />);
    const input = await findByTestId('reply-input-c-reply');
    fireEvent.changeText(input, 'Thanks for the input');
    fireEvent.press(await findByText('Send'));

    await waitFor(() => {
      expect(mockedReply).toHaveBeenCalledWith('c-reply', 'Thanks for the input');
    });
  });
});
