import React from 'react';
import { render } from '@testing-library/react-native';
import { UgcBadge } from '@/components/UgcBadge';

describe('<UgcBadge />', () => {
  it('renders "✓ CREATOR" when variant=creator', () => {
    const { getByText } = render(<UgcBadge variant="creator" />);
    expect(getByText('✓ CREATOR')).toBeTruthy();
  });

  it('renders "✓ USER CREATED" when variant=user_created', () => {
    const { getByText } = render(<UgcBadge variant="user_created" />);
    expect(getByText('✓ USER CREATED')).toBeTruthy();
  });

  it('returns null when variant=null', () => {
    const { queryByText } = render(<UgcBadge variant={null} />);
    expect(queryByText(/✓/)).toBeNull();
  });

  it('has accessibilityLabel matching the badge text', () => {
    const { getByLabelText } = render(<UgcBadge variant="creator" />);
    expect(getByLabelText('Verified creator content')).toBeTruthy();
  });
});
