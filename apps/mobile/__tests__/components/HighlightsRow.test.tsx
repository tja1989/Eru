import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('@/services/highlightsService', () => ({
  highlightsService: {
    listForUser: jest.fn(),
  },
}));

import { highlightsService } from '@/services/highlightsService';
import { HighlightsRow } from '@/components/HighlightsRow';

const mockHighlights = [
  { id: 'h1', title: 'Travel', emoji: '✈️', sortOrder: 0, createdAt: '2026-01-01', itemCount: 3 },
  { id: 'h2', title: 'Food', emoji: '🍜', sortOrder: 1, createdAt: '2026-01-01', itemCount: 1 },
];

describe('<HighlightsRow />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a thumbnail for each highlight', async () => {
    (highlightsService.listForUser as jest.Mock).mockResolvedValue(mockHighlights);
    const { getByText } = render(
      <HighlightsRow userId="u1" onSelect={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('Travel')).toBeTruthy();
      expect(getByText('Food')).toBeTruthy();
    });
  });

  it('renders emoji for each highlight', async () => {
    (highlightsService.listForUser as jest.Mock).mockResolvedValue(mockHighlights);
    const { getByText } = render(
      <HighlightsRow userId="u1" onSelect={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('✈️')).toBeTruthy();
      expect(getByText('🍜')).toBeTruthy();
    });
  });

  it('calls onSelect when a thumbnail is tapped', async () => {
    (highlightsService.listForUser as jest.Mock).mockResolvedValue(mockHighlights);
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <HighlightsRow userId="u1" onSelect={onSelect} />
    );
    await waitFor(() => expect(getByTestId('highlight-h1')).toBeTruthy());
    fireEvent.press(getByTestId('highlight-h1'));
    expect(onSelect).toHaveBeenCalledWith(mockHighlights[0]);
  });

  it('does NOT render "+ New" cell when editable is false', async () => {
    (highlightsService.listForUser as jest.Mock).mockResolvedValue(mockHighlights);
    const { queryByText } = render(
      <HighlightsRow userId="u1" onSelect={jest.fn()} editable={false} />
    );
    await waitFor(() => expect(queryByText('+ New')).toBeNull());
  });

  it('renders "+ New" cell when editable is true', async () => {
    (highlightsService.listForUser as jest.Mock).mockResolvedValue(mockHighlights);
    const { getByText } = render(
      <HighlightsRow userId="u1" onSelect={jest.fn()} editable={true} onAddNew={jest.fn()} />
    );
    await waitFor(() => expect(getByText('+ New')).toBeTruthy());
  });

  it('calls onAddNew when "+ New" is pressed', async () => {
    (highlightsService.listForUser as jest.Mock).mockResolvedValue(mockHighlights);
    const onAddNew = jest.fn();
    const { getByText } = render(
      <HighlightsRow userId="u1" onSelect={jest.fn()} editable={true} onAddNew={onAddNew} />
    );
    await waitFor(() => expect(getByText('+ New')).toBeTruthy());
    fireEvent.press(getByText('+ New'));
    expect(onAddNew).toHaveBeenCalledTimes(1);
  });

  it('renders nothing (empty list) when user has no highlights', async () => {
    (highlightsService.listForUser as jest.Mock).mockResolvedValue([]);
    const { queryByTestId } = render(
      <HighlightsRow userId="u1" onSelect={jest.fn()} />
    );
    await waitFor(() => expect(queryByTestId('highlight-h1')).toBeNull());
  });
});
