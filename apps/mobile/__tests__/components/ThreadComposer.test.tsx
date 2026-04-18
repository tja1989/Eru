import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThreadComposer } from '@/components/ThreadComposer';

// Controlled wrapper so ThreadComposer's props can be exercised
function ControlledThreadComposer(props: {
  initialParts?: string[];
  disabled?: boolean;
}) {
  const [parts, setParts] = useState<string[]>(props.initialParts ?? []);
  return (
    <ThreadComposer
      parts={parts}
      onPartsChange={setParts}
      disabled={props.disabled}
    />
  );
}

describe('<ThreadComposer />', () => {
  it('renders 2 default parts initially when parts is empty', () => {
    const { getAllByPlaceholderText } = render(<ControlledThreadComposer />);
    // Should seed 2 inputs: "Part 1…" and "Part 2…"
    expect(getAllByPlaceholderText(/^Part \d+…$/).length).toBe(2);
  });

  it('shows "Part 1" and "Part 2" labels', () => {
    const { getByText } = render(<ControlledThreadComposer />);
    expect(getByText('Part 1')).toBeTruthy();
    expect(getByText('Part 2')).toBeTruthy();
  });

  it('"+ Add part" appends a new empty part', () => {
    const { getByLabelText, getAllByPlaceholderText } = render(
      <ControlledThreadComposer />,
    );
    fireEvent.press(getByLabelText('Add part'));
    expect(getAllByPlaceholderText(/^Part \d+…$/).length).toBe(3);
  });

  it('"+ Add part" is disabled when 10 parts are present', () => {
    const tenParts = Array.from({ length: 10 }, (_, i) => `Part ${i + 1} text`);
    const { getByLabelText } = render(
      <ControlledThreadComposer initialParts={tenParts} />,
    );
    const addBtn = getByLabelText('Add part');
    expect(addBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('"−" on a part removes it', () => {
    const { getAllByLabelText, getAllByPlaceholderText } = render(
      <ControlledThreadComposer initialParts={['a', 'b', 'c']} />,
    );
    const removeBtns = getAllByLabelText('Remove part');
    fireEvent.press(removeBtns[0]);
    expect(getAllByPlaceholderText(/^Part \d+…$/).length).toBe(2);
  });

  it('"−" remove buttons are disabled when only 2 parts remain', () => {
    const { getAllByLabelText } = render(
      <ControlledThreadComposer initialParts={['a', 'b']} />,
    );
    const removeBtns = getAllByLabelText('Remove part');
    removeBtns.forEach((btn) => {
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('typing in a part propagates via onPartsChange', () => {
    const onPartsChange = jest.fn();
    const { getAllByPlaceholderText } = render(
      <ThreadComposer
        parts={['', '']}
        onPartsChange={onPartsChange}
      />,
    );
    const inputs = getAllByPlaceholderText(/^Part \d+…$/);
    fireEvent.changeText(inputs[0], 'Hello world');
    expect(onPartsChange).toHaveBeenCalledWith(['Hello world', '']);
  });

  it('shows the correct "Part X" label for each row', () => {
    const { getByText } = render(
      <ControlledThreadComposer initialParts={['a', 'b', 'c']} />,
    );
    expect(getByText('Part 1')).toBeTruthy();
    expect(getByText('Part 2')).toBeTruthy();
    expect(getByText('Part 3')).toBeTruthy();
  });
});
