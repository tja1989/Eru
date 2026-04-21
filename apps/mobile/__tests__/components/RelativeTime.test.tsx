import React from 'react';
import { render } from '@testing-library/react-native';
import { RelativeTime } from '@/components/RelativeTime';

const now = new Date('2026-04-21T10:00:00.000Z');

describe('<RelativeTime />', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders "now" for <1 minute', () => {
    const iso = new Date(now.getTime() - 30_000).toISOString();
    const { getByText } = render(<RelativeTime iso={iso} />);
    expect(getByText('now')).toBeTruthy();
  });

  it('renders "32m" for 32 minutes ago', () => {
    const iso = new Date(now.getTime() - 32 * 60_000).toISOString();
    const { getByText } = render(<RelativeTime iso={iso} />);
    expect(getByText('32m')).toBeTruthy();
  });

  it('renders "2h" for 2 hours ago', () => {
    const iso = new Date(now.getTime() - 2 * 60 * 60_000).toISOString();
    const { getByText } = render(<RelativeTime iso={iso} />);
    expect(getByText('2h')).toBeTruthy();
  });

  it('renders "3d" for 3 days ago', () => {
    const iso = new Date(now.getTime() - 3 * 24 * 60 * 60_000).toISOString();
    const { getByText } = render(<RelativeTime iso={iso} />);
    expect(getByText('3d')).toBeTruthy();
  });

  it('renders "2w" for 14 days ago', () => {
    const iso = new Date(now.getTime() - 14 * 24 * 60 * 60_000).toISOString();
    const { getByText } = render(<RelativeTime iso={iso} />);
    expect(getByText('2w')).toBeTruthy();
  });
});
