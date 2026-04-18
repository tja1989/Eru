import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('@/services/highlightsService', () => ({
  highlightsService: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addItem: jest.fn(),
  },
}));

jest.mock('@/services/userService', () => ({
  userService: {
    getContent: jest.fn(),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1' } }),
}));

import { highlightsService } from '@/services/highlightsService';
import { userService } from '@/services/userService';
import { HighlightEditor } from '@/components/HighlightEditor';

const mockContent = [
  { id: 'c1', mediaUrl: 'https://img/1.jpg', type: 'post' },
  { id: 'c2', mediaUrl: 'https://img/2.jpg', type: 'post' },
];

describe('<HighlightEditor />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders title input', () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });
    const { getByPlaceholderText } = render(
      <HighlightEditor visible={true} onClose={jest.fn()} onSaved={jest.fn()} />
    );
    expect(getByPlaceholderText('Title (max 40 chars)')).toBeTruthy();
  });

  it('renders emoji input', () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });
    const { getByPlaceholderText } = render(
      <HighlightEditor visible={true} onClose={jest.fn()} onSaved={jest.fn()} />
    );
    expect(getByPlaceholderText('Emoji')).toBeTruthy();
  });

  it('title input accepts text and calls create on save', async () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });
    (highlightsService.create as jest.Mock).mockResolvedValue({
      id: 'h1', title: 'My Trip', emoji: '🏖️', sortOrder: 0, createdAt: '2026-01-01',
    });
    const onSaved = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <HighlightEditor visible={true} onClose={jest.fn()} onSaved={onSaved} />
    );

    fireEvent.changeText(getByPlaceholderText('Title (max 40 chars)'), 'My Trip');
    fireEvent.changeText(getByPlaceholderText('Emoji'), '🏖️');

    await act(async () => {
      fireEvent.press(getByText('Save'));
    });

    expect(highlightsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Trip', emoji: '🏖️' })
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('calls update (not create) when existing highlight is provided', async () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });
    const existing = { id: 'h1', title: 'Old Title', emoji: '⭐', sortOrder: 0, createdAt: '2026-01-01', itemCount: 0 };
    (highlightsService.update as jest.Mock).mockResolvedValue({
      ...existing, title: 'New Title',
    });
    const onSaved = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <HighlightEditor visible={true} onClose={jest.fn()} onSaved={onSaved} existing={existing} />
    );

    fireEvent.changeText(getByPlaceholderText('Title (max 40 chars)'), 'New Title');

    await act(async () => {
      fireEvent.press(getByText('Save'));
    });

    expect(highlightsService.update).toHaveBeenCalledWith('h1', expect.objectContaining({ title: 'New Title' }));
    expect(highlightsService.create).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('shows Delete button when editing an existing highlight', () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });
    const existing = { id: 'h1', title: 'Old Title', emoji: '⭐', sortOrder: 0, createdAt: '2026-01-01', itemCount: 0 };

    const { getByText } = render(
      <HighlightEditor visible={true} onClose={jest.fn()} onSaved={jest.fn()} existing={existing} />
    );
    expect(getByText('Delete')).toBeTruthy();
  });

  it('does NOT show Delete button when creating a new highlight', () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });

    const { queryByText } = render(
      <HighlightEditor visible={true} onClose={jest.fn()} onSaved={jest.fn()} />
    );
    expect(queryByText('Delete')).toBeNull();
  });

  it('calls remove and onClose when delete is confirmed', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      // find the destructive button and fire it
      const destroy = (buttons ?? []).find((b: any) => b.style === 'destructive');
      destroy?.onPress?.();
    });
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });
    const existing = { id: 'h1', title: 'Old Title', emoji: '⭐', sortOrder: 0, createdAt: '2026-01-01', itemCount: 0 };
    (highlightsService.remove as jest.Mock).mockResolvedValue(undefined);
    const onClose = jest.fn();
    const onSaved = jest.fn();

    const { getByText } = render(
      <HighlightEditor visible={true} onClose={onClose} onSaved={onSaved} existing={existing} />
    );

    await act(async () => {
      fireEvent.press(getByText('Delete'));
    });

    expect(highlightsService.remove).toHaveBeenCalledWith('h1');
    expect(onSaved).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalled();
  });

  it('tapping delete shows a confirmation alert (dismissable)', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      // find the cancel button and fire it
      const cancel = (buttons ?? []).find((b: any) => b.style === 'cancel');
      cancel?.onPress?.();
    });
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });
    const existing = { id: 'h1', title: 'Old Title', emoji: '⭐', sortOrder: 0, createdAt: '2026-01-01', itemCount: 0 };
    (highlightsService.remove as jest.Mock).mockResolvedValue(undefined);
    const onClose = jest.fn();
    const onSaved = jest.fn();

    const { getByText } = render(
      <HighlightEditor visible={true} onClose={onClose} onSaved={onSaved} existing={existing} />
    );

    await act(async () => {
      fireEvent.press(getByText('Delete'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Highlight',
      expect.stringContaining('Old Title'),
      expect.any(Array),
    );
    expect(highlightsService.remove).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders user content grid for multi-select', async () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: mockContent });

    const { getByTestId } = render(
      <HighlightEditor visible={true} onClose={jest.fn()} onSaved={jest.fn()} />
    );

    await waitFor(() => {
      expect(getByTestId('content-select-c1')).toBeTruthy();
      expect(getByTestId('content-select-c2')).toBeTruthy();
    });
  });

  it('toggling a content item adds it to selection', async () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: mockContent });
    (highlightsService.create as jest.Mock).mockResolvedValue({
      id: 'h1', title: 'New', emoji: '⭐', sortOrder: 0, createdAt: '2026-01-01',
    });
    (highlightsService.addItem as jest.Mock).mockResolvedValue({ id: 'i1' });

    const { getByTestId, getByPlaceholderText, getByText } = render(
      <HighlightEditor visible={true} onClose={jest.fn()} onSaved={jest.fn()} />
    );

    await waitFor(() => expect(getByTestId('content-select-c1')).toBeTruthy());

    fireEvent.press(getByTestId('content-select-c1'));
    fireEvent.changeText(getByPlaceholderText('Title (max 40 chars)'), 'New');
    fireEvent.changeText(getByPlaceholderText('Emoji'), '⭐');

    await act(async () => {
      fireEvent.press(getByText('Save'));
    });

    expect(highlightsService.addItem).toHaveBeenCalledWith('h1', 'c1');
  });
});
