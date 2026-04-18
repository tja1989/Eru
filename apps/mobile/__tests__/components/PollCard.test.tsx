import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PollCard } from '@/components/PollCard';
import pollService from '@/services/pollService';

jest.mock('@/services/pollService', () => ({
  __esModule: true,
  default: {
    vote: jest.fn(),
  },
}));

const baseOptions = [
  { id: 'opt-a', text: 'Option A', voteCount: 3 },
  { id: 'opt-b', text: 'Option B', voteCount: 1 },
];

const baseProps = {
  contentId: 'content-1',
  question: 'What is your favourite?',
  pollOptions: baseOptions,
  userVote: null,
};

describe('<PollCard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pollService.vote as jest.Mock).mockResolvedValue({ success: true, pollOptionId: 'opt-a', totalVotes: 4 });
  });

  it('renders question and all options', () => {
    const { getByText } = render(<PollCard {...baseProps} />);
    expect(getByText('What is your favourite?')).toBeTruthy();
    expect(getByText('Option A')).toBeTruthy();
    expect(getByText('Option B')).toBeTruthy();
  });

  it('shows correct percentage for each option based on voteCount/totalVotes', () => {
    const { getByText } = render(<PollCard {...baseProps} />);
    // total = 4, opt-a = 3 → 75%, opt-b = 1 → 25%
    expect(getByText('75%')).toBeTruthy();
    expect(getByText('25%')).toBeTruthy();
  });

  it('shows 0% for all options and no crash when totalVotes is 0', () => {
    const zeroOptions = [
      { id: 'opt-a', text: 'Option A', voteCount: 0 },
      { id: 'opt-b', text: 'Option B', voteCount: 0 },
    ];
    const { getAllByText } = render(<PollCard {...baseProps} pollOptions={zeroOptions} />);
    const zeros = getAllByText('0%');
    expect(zeros).toHaveLength(2);
  });

  it('tapping an option without a prior vote calls pollService.vote', async () => {
    const { getByText } = render(<PollCard {...baseProps} userVote={null} />);
    fireEvent.press(getByText('Option A'));
    expect(pollService.vote).toHaveBeenCalledWith('content-1', 'opt-a');
  });

  it('optimistically increments tapped option and decrements old one before promise resolves (reassign)', async () => {
    let resolveVote!: (v: any) => void;
    (pollService.vote as jest.Mock).mockReturnValue(
      new Promise((res) => { resolveVote = res; }),
    );

    const { getByText } = render(
      <PollCard {...baseProps} userVote="opt-a" />
    );

    // Before tap: opt-a=3 (75%), opt-b=1 (25%), total=4
    // After tap opt-b: opt-a→2, opt-b→2, total stays 4
    // → opt-a 50%, opt-b 50%
    fireEvent.press(getByText('Option B'));

    // Optimistic update should be immediate: opt-a drops from 75% to 50%,
    // opt-b rises from 25% to 50%. Verify old dominant % is gone.
    expect(() => getByText('75%')).toThrow();
    expect(() => getByText('25%')).toThrow();

    await act(async () => { resolveVote({ success: true, pollOptionId: 'opt-b', totalVotes: 4 }); });
  });

  it('tapping the already-voted option is a no-op (no service call, state unchanged)', () => {
    const { getByText } = render(
      <PollCard {...baseProps} userVote="opt-a" />
    );
    fireEvent.press(getByText('Option A'));
    expect(pollService.vote).not.toHaveBeenCalled();
    // percentages unchanged: 75% still shown
    expect(getByText('75%')).toBeTruthy();
  });

  it('rolls back state if pollService.vote rejects', async () => {
    (pollService.vote as jest.Mock).mockRejectedValue(new Error('network error'));

    const { getByText } = render(<PollCard {...baseProps} userVote={null} />);

    // Before: opt-a 75%, opt-b 25%
    fireEvent.press(getByText('Option A'));

    // After rollback: percentages must restore
    await waitFor(() => {
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('25%')).toBeTruthy();
    });
  });

  it('shows checkmark on the option matching userVote', () => {
    const { getByLabelText } = render(
      <PollCard {...baseProps} userVote="opt-a" />
    );
    expect(getByLabelText('Your vote')).toBeTruthy();
  });

  it('shows total vote count below the options', () => {
    const { getByText } = render(<PollCard {...baseProps} />);
    expect(getByText('4 votes')).toBeTruthy();
  });

  it('shows "1 vote" (singular) when totalVotes is 1', () => {
    const oneVote = [
      { id: 'opt-a', text: 'Option A', voteCount: 1 },
      { id: 'opt-b', text: 'Option B', voteCount: 0 },
    ];
    const { getByText } = render(<PollCard {...baseProps} pollOptions={oneVote} />);
    expect(getByText('1 vote')).toBeTruthy();
  });
});
