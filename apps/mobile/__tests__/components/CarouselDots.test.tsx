import React from 'react';
import { render } from '@testing-library/react-native';
import { CarouselDots } from '@/components/CarouselDots';

describe('<CarouselDots />', () => {
  it('returns null when count is 0 or 1', () => {
    const { queryByLabelText: q1 } = render(<CarouselDots count={0} activeIndex={0} />);
    expect(q1('carousel indicator')).toBeNull();
    const { queryByLabelText: q2 } = render(<CarouselDots count={1} activeIndex={0} />);
    expect(q2('carousel indicator')).toBeNull();
  });

  it('renders 3 dots for count=3', () => {
    const { getAllByLabelText } = render(<CarouselDots count={3} activeIndex={0} />);
    expect(getAllByLabelText(/carousel dot/)).toHaveLength(3);
  });

  it('marks the correct dot as active', () => {
    const { getAllByLabelText } = render(<CarouselDots count={4} activeIndex={2} />);
    const dots = getAllByLabelText(/carousel dot/);
    expect(dots[0].props.accessibilityState?.selected).toBe(false);
    expect(dots[2].props.accessibilityState?.selected).toBe(true);
  });

  it('container has accessibilityLabel "carousel indicator"', () => {
    const { getByLabelText } = render(<CarouselDots count={3} activeIndex={0} />);
    expect(getByLabelText('carousel indicator')).toBeTruthy();
  });
});
