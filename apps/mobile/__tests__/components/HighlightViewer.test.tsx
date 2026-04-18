import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { HighlightViewer } from '@/components/HighlightViewer';

const mockHighlight = { id: 'h1', title: 'Travel', emoji: '✈️', sortOrder: 0, createdAt: '2026-01-01', itemCount: 2 };

const mockItems = [
  {
    id: 'i1',
    highlightId: 'h1',
    contentId: 'c1',
    sortOrder: 0,
    content: { id: 'c1', mediaUrl: 'https://img/1.jpg', type: 'post', caption: 'First post' },
  },
  {
    id: 'i2',
    highlightId: 'h1',
    contentId: 'c2',
    sortOrder: 1,
    content: { id: 'c2', mediaUrl: 'https://img/2.jpg', type: 'post', caption: 'Second post' },
  },
];

describe('<HighlightViewer />', () => {
  it('renders first item initially', () => {
    const { getByText } = render(
      <HighlightViewer
        visible={true}
        onClose={jest.fn()}
        highlight={mockHighlight}
        items={mockItems}
      />
    );
    expect(getByText('First post')).toBeTruthy();
  });

  it('shows item counter starting at 1/N', () => {
    const { getByText } = render(
      <HighlightViewer
        visible={true}
        onClose={jest.fn()}
        highlight={mockHighlight}
        items={mockItems}
      />
    );
    expect(getByText('1 / 2')).toBeTruthy();
  });

  it('calls onClose when X button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <HighlightViewer
        visible={true}
        onClose={onClose}
        highlight={mockHighlight}
        items={mockItems}
      />
    );
    fireEvent.press(getByTestId('viewer-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('advances to the next item when Next is pressed', async () => {
    const { getByTestId, getByText } = render(
      <HighlightViewer
        visible={true}
        onClose={jest.fn()}
        highlight={mockHighlight}
        items={mockItems}
      />
    );
    await act(async () => {
      fireEvent.press(getByTestId('viewer-next'));
    });
    expect(getByText('Second post')).toBeTruthy();
    expect(getByText('2 / 2')).toBeTruthy();
  });

  it('goes back to previous item when Prev is pressed', async () => {
    const { getByTestId, getByText } = render(
      <HighlightViewer
        visible={true}
        onClose={jest.fn()}
        highlight={mockHighlight}
        items={mockItems}
      />
    );
    // advance to item 2
    await act(async () => {
      fireEvent.press(getByTestId('viewer-next'));
    });
    // go back
    await act(async () => {
      fireEvent.press(getByTestId('viewer-prev'));
    });
    expect(getByText('First post')).toBeTruthy();
    expect(getByText('1 / 2')).toBeTruthy();
  });

  it('renders empty state when items array is empty', () => {
    const { getByText } = render(
      <HighlightViewer
        visible={true}
        onClose={jest.fn()}
        highlight={mockHighlight}
        items={[]}
      />
    );
    expect(getByText('No items in this highlight')).toBeTruthy();
  });

  it('renders the highlight title', () => {
    const { getByText } = render(
      <HighlightViewer
        visible={true}
        onClose={jest.fn()}
        highlight={mockHighlight}
        items={mockItems}
      />
    );
    expect(getByText('Travel')).toBeTruthy();
  });
});
