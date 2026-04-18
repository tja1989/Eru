import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PollForm } from '@/components/PollForm';

// Wrapper so PollForm's controlled pattern can be exercised
function ControlledPollForm(props: {
  initialQuestion?: string;
  initialOptions?: string[];
  disabled?: boolean;
}) {
  const [question, setQuestion] = useState(props.initialQuestion ?? '');
  const [options, setOptions] = useState<string[]>(props.initialOptions ?? []);
  return (
    <PollForm
      question={question}
      onQuestionChange={setQuestion}
      options={options}
      onOptionsChange={setOptions}
      disabled={props.disabled}
    />
  );
}

describe('<PollForm />', () => {
  it('renders 2 option rows by default when options is empty', () => {
    const { getAllByPlaceholderText } = render(
      <ControlledPollForm />
    );
    // Each option row has an "Option N" placeholder
    const optionInputs = getAllByPlaceholderText(/^Option \d$/);
    expect(optionInputs).toHaveLength(2);
  });

  it('"+" button adds a third option row', () => {
    const { getByLabelText, getAllByPlaceholderText } = render(
      <ControlledPollForm />
    );
    fireEvent.press(getByLabelText('Add option'));
    const optionInputs = getAllByPlaceholderText(/^Option \d$/);
    expect(optionInputs).toHaveLength(3);
  });

  it('"+" button is disabled when 4 options are present', () => {
    const { getByLabelText } = render(
      <ControlledPollForm initialOptions={['a', 'b', 'c', 'd']} />
    );
    const addBtn = getByLabelText('Add option');
    expect(addBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('"−" button on an option removes it', () => {
    const { getAllByLabelText, getAllByPlaceholderText } = render(
      <ControlledPollForm initialOptions={['a', 'b', 'c']} />
    );
    const removeBtns = getAllByLabelText('Remove option');
    fireEvent.press(removeBtns[0]);
    const optionInputs = getAllByPlaceholderText(/^Option \d$/);
    expect(optionInputs).toHaveLength(2);
  });

  it('"−" button is disabled when only 2 options remain', () => {
    const { getAllByLabelText } = render(
      <ControlledPollForm initialOptions={['a', 'b']} />
    );
    const removeBtns = getAllByLabelText('Remove option');
    removeBtns.forEach((btn) => {
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('typing in an option field propagates via onOptionsChange', () => {
    const onOptionsChange = jest.fn();
    const { getAllByPlaceholderText } = render(
      <PollForm
        question=""
        onQuestionChange={jest.fn()}
        options={['', '']}
        onOptionsChange={onOptionsChange}
      />
    );
    const inputs = getAllByPlaceholderText(/^Option \d$/);
    fireEvent.changeText(inputs[0], 'First choice');
    expect(onOptionsChange).toHaveBeenCalledWith(['First choice', '']);
  });

  it('typing in the question field propagates via onQuestionChange', () => {
    const onQuestionChange = jest.fn();
    const { getByPlaceholderText } = render(
      <PollForm
        question=""
        onQuestionChange={onQuestionChange}
        options={['', '']}
        onOptionsChange={jest.fn()}
      />
    );
    const questionInput = getByPlaceholderText('Ask a question…');
    fireEvent.changeText(questionInput, 'Favourite colour?');
    expect(onQuestionChange).toHaveBeenCalledWith('Favourite colour?');
  });
});
