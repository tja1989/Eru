import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressSteps } from '@/components/ProgressSteps';

describe('<ProgressSteps />', () => {
  it('renders N segments matching total prop', () => {
    const { getAllByTestId } = render(<ProgressSteps current={1} total={4} />);
    expect(getAllByTestId(/^progress-seg-/)).toHaveLength(4);
  });

  it('segments before current are green (done); active is orange', () => {
    const { getByTestId } = render(<ProgressSteps current={3} total={4} />);
    const seg1 = getByTestId('progress-seg-1');
    const seg2 = getByTestId('progress-seg-2');
    const seg3 = getByTestId('progress-seg-3');
    const seg4 = getByTestId('progress-seg-4');
    const flatten = (s: any) => Object.assign({}, ...(Array.isArray(s) ? s : [s]));
    expect(flatten(seg1.props.style).backgroundColor).toBe('#10B981');
    expect(flatten(seg2.props.style).backgroundColor).toBe('#10B981');
    expect(flatten(seg3.props.style).backgroundColor).toBe('#E8792B');
    expect(flatten(seg4.props.style).backgroundColor).toBe('#DBDBDB');
  });

  it('renders the caption when provided', () => {
    const { getByText } = render(
      <ProgressSteps current={1} total={4} caption="Step 1 of 4 • Tell us what you love" />,
    );
    expect(getByText(/Step 1 of 4/)).toBeTruthy();
  });

  it('omits caption when not provided', () => {
    const { queryByText } = render(<ProgressSteps current={1} total={4} />);
    expect(queryByText(/Step/)).toBeNull();
  });

  it('exposes a screen-reader label of "Step N of total"', () => {
    const { getByLabelText } = render(<ProgressSteps current={2} total={4} />);
    expect(getByLabelText('Step 2 of 4')).toBeTruthy();
  });
});
