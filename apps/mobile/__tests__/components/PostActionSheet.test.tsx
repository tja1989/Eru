import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PostActionSheet } from '@/components/PostActionSheet';
import { contentService } from '@/services/contentService';

jest.mock('@/services/contentService');

describe('<PostActionSheet />', () => {
  const base = {
    visible: true,
    onClose: jest.fn(),
    contentId: 'c1',
    authorUserId: 'u-other',
    currentUserId: 'u-me',
  };

  beforeEach(() => jest.clearAllMocks());

  it('always shows Report option', () => {
    const { getByText } = render(<PostActionSheet {...base} />);
    expect(getByText(/report/i)).toBeTruthy();
  });

  it('does NOT show Delete when viewer is not the author', () => {
    const { queryByText } = render(<PostActionSheet {...base} />);
    expect(queryByText(/^delete$/i)).toBeNull();
  });

  it('DOES show Delete when viewer is the author', () => {
    const { getByText } = render(
      <PostActionSheet {...base} authorUserId="u-me" currentUserId="u-me" />,
    );
    expect(getByText(/^delete$/i)).toBeTruthy();
  });

  it('tapping Report opens the reason picker', () => {
    const { getByText } = render(<PostActionSheet {...base} />);
    fireEvent.press(getByText(/report/i));
    expect(getByText(/why are you reporting/i)).toBeTruthy();
    ['Spam', 'Harassment', 'Nudity', 'Hate', 'Violence', 'Misinformation', 'Other'].forEach((r) => {
      expect(getByText(r)).toBeTruthy();
    });
  });

  it('selecting a reason calls contentService.report and closes', async () => {
    (contentService.report as jest.Mock).mockResolvedValue({ id: 'r1' });
    const onClose = jest.fn();
    const { getByText } = render(<PostActionSheet {...base} onClose={onClose} />);
    fireEvent.press(getByText(/report/i));
    fireEvent.press(getByText('Spam'));
    await waitFor(() => {
      expect(contentService.report).toHaveBeenCalledWith('c1', 'spam', undefined);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows a confirmation toast after report succeeds', async () => {
    (contentService.report as jest.Mock).mockResolvedValue({ id: 'r1' });
    const { getByText, findByText } = render(<PostActionSheet {...base} />);
    fireEvent.press(getByText(/report/i));
    fireEvent.press(getByText('Harassment'));
    expect(await findByText(/thanks — our team will review/i)).toBeTruthy();
  });

  it('shows an error if the service rejects', async () => {
    (contentService.report as jest.Mock).mockRejectedValue({
      response: { status: 409, data: { error: 'You have already reported this content' } },
    });
    const { getByText, findByText } = render(<PostActionSheet {...base} />);
    fireEvent.press(getByText(/report/i));
    fireEvent.press(getByText('Spam'));
    expect(await findByText(/already reported/i)).toBeTruthy();
  });
});
