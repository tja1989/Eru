import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { BusinessTagPicker } from '@/components/BusinessTagPicker';
import { businessService } from '@/services/businessService';

jest.mock('@/services/businessService');

const sampleItems = [
  { id: 'b1', name: 'Kashi Bakes', category: 'bakery', pincode: '682016', avatarUrl: null },
  { id: 'b2', name: 'Kashi Kitchen', category: 'cafe', pincode: '682001', avatarUrl: null },
];

describe('<BusinessTagPicker />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (businessService.search as jest.Mock).mockResolvedValue(sampleItems);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders label "🏪 Tag a Business" + commission badge when no selection', () => {
    const { getByText } = render(<BusinessTagPicker value={null} onChange={jest.fn()} />);
    expect(getByText(/🏪 Tag a Business/)).toBeTruthy();
    expect(getByText(/\+20% commission/i)).toBeTruthy();
  });

  it('does NOT call search on mount (empty input)', () => {
    render(<BusinessTagPicker value={null} onChange={jest.fn()} />);
    expect(businessService.search).not.toHaveBeenCalled();
  });

  it('debounces calls: single search after 150ms of no-typing', async () => {
    const { getByPlaceholderText } = render(<BusinessTagPicker value={null} onChange={jest.fn()} />);
    const input = getByPlaceholderText(/Search businesses/i);

    fireEvent.changeText(input, 'k');
    fireEvent.changeText(input, 'ka');
    fireEvent.changeText(input, 'kas');
    fireEvent.changeText(input, 'kash');
    expect(businessService.search).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(150);
    });
    expect(businessService.search).toHaveBeenCalledTimes(1);
    expect(businessService.search).toHaveBeenCalledWith('kash');
  });

  it('renders result names after search resolves', async () => {
    const { getByPlaceholderText, findByText } = render(
      <BusinessTagPicker value={null} onChange={jest.fn()} />,
    );
    fireEvent.changeText(getByPlaceholderText(/Search businesses/i), 'kash');
    await act(async () => { jest.advanceTimersByTime(150); });
    expect(await findByText('Kashi Bakes')).toBeTruthy();
    expect(await findByText('Kashi Kitchen')).toBeTruthy();
  });

  it('tapping a result calls onChange with the business + clears input', async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText, findByText, getByDisplayValue } = render(
      <BusinessTagPicker value={null} onChange={onChange} />,
    );
    fireEvent.changeText(getByPlaceholderText(/Search businesses/i), 'kash');
    await act(async () => { jest.advanceTimersByTime(150); });
    const row = await findByText('Kashi Bakes');
    fireEvent.press(row);
    expect(onChange).toHaveBeenCalledWith(sampleItems[0]);
    // Input cleared after selection (we rely on the chip being visible now)
    expect(() => getByDisplayValue('kash')).toThrow();
  });

  it('selected chip shows @Name with ✕ remove; tapping ✕ calls onChange(null)', () => {
    const onChange = jest.fn();
    const { getByText, getByLabelText } = render(
      <BusinessTagPicker value={sampleItems[0]} onChange={onChange} />,
    );
    expect(getByText('@Kashi Bakes')).toBeTruthy();
    const removeBtn = getByLabelText('Remove business tag');
    fireEvent.press(removeBtn);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows the help-text paragraph about earning 20%', () => {
    const { getByText } = render(<BusinessTagPicker value={null} onChange={jest.fn()} />);
    expect(getByText(/earn 20% of their spend/i)).toBeTruthy();
  });
});
