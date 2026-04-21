import React from 'react';
import { render } from '@testing-library/react-native';
import { ModerationNoticeCard } from '@/components/ModerationNoticeCard';

describe('<ModerationNoticeCard />', () => {
  it('renders the 🛡️ Content Review title', () => {
    const { getByText } = render(<ModerationNoticeCard />);
    expect(getByText(/🛡️ Content Review/)).toBeTruthy();
  });

  it('includes the 15 minute approval window copy', () => {
    const { getByText } = render(<ModerationNoticeCard />);
    expect(getByText(/approved within 15 minutes/i)).toBeTruthy();
  });

  it('mentions the +30 pts reward once approved', () => {
    const { getByText } = render(<ModerationNoticeCard />);
    expect(getByText(/\+30 pts/)).toBeTruthy();
  });
});
