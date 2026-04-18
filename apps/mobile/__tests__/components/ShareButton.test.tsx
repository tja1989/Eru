import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ShareButton } from '@/components/ShareButton';

// Mock the points store so we can assert `earn` is (or isn't) called.
const mockEarn = jest.fn();
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: { getState: () => ({ earn: (...args: any[]) => mockEarn(...args) }) },
}));

describe('<ShareButton />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEarn.mockClear();
  });

  it('tapping opens Share.share with a URL containing the contentId and a message with @username', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction } as any);

    const { getByTestId } = render(
      <ShareButton
        contentId="post-123"
        creatorUsername="alice"
        caption="hello world"
      />,
    );

    fireEvent.press(getByTestId('share-button'));

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledTimes(1);
    });
    const shareArg = shareSpy.mock.calls[0][0] as { url?: string; message: string };
    const combined = `${shareArg.url ?? ''} ${shareArg.message ?? ''}`;
    expect(combined).toContain('post-123');
    expect(shareArg.message).toContain('@alice');
  });

  it('awards share points via usePointsStore.earn when share succeeds', async () => {
    jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction } as any);

    const { getByTestId } = render(
      <ShareButton
        contentId="post-123"
        creatorUsername="alice"
        caption="hello"
      />,
    );

    fireEvent.press(getByTestId('share-button'));

    await waitFor(() => {
      expect(mockEarn).toHaveBeenCalledWith('share', 'post-123');
    });
  });

  it('does NOT award points when user dismisses the share sheet', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.dismissedAction } as any);

    const { getByTestId } = render(
      <ShareButton
        contentId="post-123"
        creatorUsername="alice"
        caption="hello"
      />,
    );

    fireEvent.press(getByTestId('share-button'));

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledTimes(1);
    });
    // earn must not have been invoked
    expect(mockEarn).not.toHaveBeenCalled();
  });
});
