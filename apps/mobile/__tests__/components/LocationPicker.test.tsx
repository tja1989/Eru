import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── Mock expo-location ───────────────────────────────────────────────────────
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

// ─── Mock locationsService ────────────────────────────────────────────────────
jest.mock('@/services/locationsService', () => ({
  locationsService: {
    search: jest.fn(),
  },
}));

import * as Location from 'expo-location';
import { locationsService } from '@/services/locationsService';
import { LocationPicker } from '@/components/LocationPicker';

const mockLocationsService = locationsService as jest.Mocked<typeof locationsService>;
const mockLocation = Location as jest.Mocked<typeof Location>;

const SAMPLE_RESULTS = [
  { pincode: '400001', area: 'Fort', district: 'Mumbai', state: 'Maharashtra' },
  { pincode: '400002', area: 'Marine Lines', district: 'Mumbai', state: 'Maharashtra' },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('<LocationPicker />', () => {
  it('renders search input with correct placeholder', () => {
    const { getByPlaceholderText } = render(
      <LocationPicker onSelect={jest.fn()} />
    );
    expect(
      getByPlaceholderText('Search by area, district, or 6-digit pincode')
    ).toBeTruthy();
  });

  it('renders "Use my current location" button', () => {
    const { getByText } = render(<LocationPicker onSelect={jest.fn()} />);
    expect(getByText(/Use my current location/i)).toBeTruthy();
  });

  it('does NOT call locationsService.search with fewer than 2 chars', async () => {
    const { getByPlaceholderText } = render(<LocationPicker onSelect={jest.fn()} />);
    const input = getByPlaceholderText('Search by area, district, or 6-digit pincode');

    fireEvent.changeText(input, 'F');
    act(() => { jest.advanceTimersByTime(400); });

    expect(mockLocationsService.search).not.toHaveBeenCalled();
  });

  it('calls locationsService.search after debounce with 2+ chars', async () => {
    mockLocationsService.search.mockResolvedValue(SAMPLE_RESULTS);

    const { getByPlaceholderText } = render(<LocationPicker onSelect={jest.fn()} />);
    const input = getByPlaceholderText('Search by area, district, or 6-digit pincode');

    fireEvent.changeText(input, 'Fort');

    // Before debounce fires, search not yet called
    expect(mockLocationsService.search).not.toHaveBeenCalled();

    // Advance past the 300ms debounce
    await act(async () => { jest.advanceTimersByTime(350); });

    expect(mockLocationsService.search).toHaveBeenCalledWith('Fort');
  });

  it('renders results: area text and pincode visible', async () => {
    mockLocationsService.search.mockResolvedValue(SAMPLE_RESULTS);

    const { getByPlaceholderText, getByText } = render(
      <LocationPicker onSelect={jest.fn()} />
    );
    const input = getByPlaceholderText('Search by area, district, or 6-digit pincode');

    fireEvent.changeText(input, 'Fort');
    await act(async () => { jest.advanceTimersByTime(350); });

    await waitFor(() => {
      expect(getByText('Fort')).toBeTruthy();
      expect(getByText('400001')).toBeTruthy();
    });
  });

  it('tapping a result calls onSelect with pincode and meta', async () => {
    mockLocationsService.search.mockResolvedValue(SAMPLE_RESULTS);
    const onSelect = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <LocationPicker onSelect={onSelect} />
    );
    const input = getByPlaceholderText('Search by area, district, or 6-digit pincode');

    fireEvent.changeText(input, 'Fort');
    await act(async () => { jest.advanceTimersByTime(350); });

    await waitFor(() => expect(getByText('Fort')).toBeTruthy());
    fireEvent.press(getByText('Fort'));

    expect(onSelect).toHaveBeenCalledWith('400001', SAMPLE_RESULTS[0]);
  });

  it('GPS granted path: onSelect called with reverseGeocoded postalCode', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 18.9387, longitude: 72.8353 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      { postalCode: '400001' },
    ] as any);

    const onSelect = jest.fn();
    const { getByText } = render(<LocationPicker onSelect={onSelect} />);

    await act(async () => {
      fireEvent.press(getByText(/Use my current location/i));
    });

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('400001');
    });
  });

  it('GPS denied path: shows permission error message', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as any);

    const onSelect = jest.fn();
    const { getByText } = render(<LocationPicker onSelect={onSelect} />);

    await act(async () => {
      fireEvent.press(getByText(/Use my current location/i));
    });

    await waitFor(() => {
      expect(getByText(/Location permission/i)).toBeTruthy();
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows a search error when the search API rejects', async () => {
    mockLocationsService.search.mockRejectedValue(new Error('Network error'));
    const { getByPlaceholderText, findByText } = render(<LocationPicker onSelect={jest.fn()} />);
    fireEvent.changeText(getByPlaceholderText(/search by area/i), 'koch');
    act(() => { jest.advanceTimersByTime(350); });
    expect(await findByText(/search failed/i)).toBeTruthy();
  });

  it('GPS invalid postalCode: shows "could not detect pincode" error', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 18.9387, longitude: 72.8353 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      { postalCode: null },
    ] as any);

    const onSelect = jest.fn();
    const { getByText } = render(<LocationPicker onSelect={onSelect} />);

    await act(async () => {
      fireEvent.press(getByText(/Use my current location/i));
    });

    await waitFor(() => {
      expect(getByText(/could not detect pincode/i)).toBeTruthy();
    });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
