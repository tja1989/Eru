import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CommentSortDropdown } from '@/components/CommentSortDropdown';

describe('<CommentSortDropdown />', () => {
  it('renders "Most liked ▾" when value=top', () => {
    const { getByText } = render(<CommentSortDropdown value="top" onChange={jest.fn()} />);
    expect(getByText(/Most liked/i)).toBeTruthy();
  });

  it('renders "Most recent ▾" when value=recent', () => {
    const { getByText } = render(<CommentSortDropdown value="recent" onChange={jest.fn()} />);
    expect(getByText(/Most recent/i)).toBeTruthy();
  });

  it('toggles between top and recent on press', () => {
    const onChange = jest.fn();
    const { getByRole, rerender } = render(
      <CommentSortDropdown value="top" onChange={onChange} />,
    );
    fireEvent.press(getByRole('button'));
    expect(onChange).toHaveBeenCalledWith('recent');

    rerender(<CommentSortDropdown value="recent" onChange={onChange} />);
    fireEvent.press(getByRole('button'));
    expect(onChange).toHaveBeenCalledWith('top');
  });

  it('has an accessibility label describing the current sort', () => {
    const { getByLabelText } = render(<CommentSortDropdown value="top" onChange={jest.fn()} />);
    expect(getByLabelText('Change comment sort, currently Most liked')).toBeTruthy();
  });
});
