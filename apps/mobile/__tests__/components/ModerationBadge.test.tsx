import React from 'react';
import { render } from '@testing-library/react-native';
import { ModerationBadge } from '@/components/ModerationBadge';

describe('<ModerationBadge />', () => {
  it('renders ✓ APPROVED when variant=approved', () => {
    const { getByText } = render(<ModerationBadge variant="approved" />);
    expect(getByText('✓ APPROVED')).toBeTruthy();
  });

  it('renders ⏳ PENDING when variant=pending', () => {
    const { getByText } = render(<ModerationBadge variant="pending" />);
    expect(getByText('⏳ PENDING')).toBeTruthy();
  });

  it('renders ✕ DECLINED when variant=declined', () => {
    const { getByText } = render(<ModerationBadge variant="declined" />);
    expect(getByText('✕ DECLINED')).toBeTruthy();
  });

  it('returns null when variant=null', () => {
    const { queryByText } = render(<ModerationBadge variant={null} />);
    expect(queryByText(/APPROVED|PENDING|DECLINED/)).toBeNull();
  });
});
