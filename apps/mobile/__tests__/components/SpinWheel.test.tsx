import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SpinWheel } from '@/components/SpinWheel';

describe('<SpinWheel />', () => {
  it('renders the wheel', () => {
    const { getByTestId } = render(<SpinWheel spinning={false} onSpin={jest.fn()} />);
    expect(getByTestId('spin-wheel')).toBeTruthy();
  });

  it('calls onSpin when tapped and not spinning', () => {
    const onSpin = jest.fn();
    const { getByText } = render(<SpinWheel spinning={false} onSpin={onSpin} />);
    fireEvent.press(getByText(/spin now/i));
    expect(onSpin).toHaveBeenCalled();
  });

  it('disables the button while spinning', () => {
    const onSpin = jest.fn();
    const { getByText } = render(<SpinWheel spinning={true} onSpin={onSpin} />);
    fireEvent.press(getByText(/spinning/i));
    expect(onSpin).not.toHaveBeenCalled();
  });
});
