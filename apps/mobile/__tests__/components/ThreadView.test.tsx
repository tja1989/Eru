import React from 'react';
import { render } from '@testing-library/react-native';
import { ThreadView } from '@/components/ThreadView';

const threeParts = [
  { id: 'p1', text: 'First part text', threadPosition: 0 },
  { id: 'p2', text: 'Second part text', threadPosition: 1 },
  { id: 'p3', text: 'Third part text', threadPosition: 2 },
];

describe('<ThreadView />', () => {
  it('renders all parts in the order provided', () => {
    const { getByText } = render(<ThreadView parts={threeParts} />);
    expect(getByText('First part text')).toBeTruthy();
    expect(getByText('Second part text')).toBeTruthy();
    expect(getByText('Third part text')).toBeTruthy();
  });

  it('shows position badge "1", "2", "3" for a 3-part thread', () => {
    const { getByText } = render(<ThreadView parts={threeParts} />);
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('renders "No parts" empty state when parts array is empty', () => {
    const { getByText } = render(<ThreadView parts={[]} />);
    expect(getByText('No parts')).toBeTruthy();
  });

  it('shows "3 parts" header for a 3-part thread', () => {
    const { getByText } = render(<ThreadView parts={threeParts} />);
    expect(getByText('3 parts')).toBeTruthy();
  });
});
