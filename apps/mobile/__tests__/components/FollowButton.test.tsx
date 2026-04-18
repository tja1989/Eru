import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FollowButton } from '@/components/FollowButton';
import { userService } from '@/services/userService';

jest.mock('@/services/userService');

describe('<FollowButton />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders "Follow" when initiallyFollowing=false', () => {
    const { getByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={false} />,
    );
    expect(getByText(/^Follow$/)).toBeTruthy();
  });

  it('renders "Following" when initiallyFollowing=true', () => {
    const { getByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={true} />,
    );
    expect(getByText(/^Following$/)).toBeTruthy();
  });

  it('tapping "Follow" calls userService.follow and optimistically flips label', async () => {
    (userService.follow as jest.Mock).mockResolvedValue(undefined);
    const { getByText, findByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={false} />,
    );
    fireEvent.press(getByText('Follow'));
    expect(await findByText('Following')).toBeTruthy();
    await waitFor(() => {
      expect(userService.follow).toHaveBeenCalledWith('u1');
    });
  });

  it('tapping "Following" calls userService.unfollow and reverts to "Follow"', async () => {
    (userService.unfollow as jest.Mock).mockResolvedValue(undefined);
    const { getByText, findByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={true} />,
    );
    fireEvent.press(getByText('Following'));
    expect(await findByText('Follow')).toBeTruthy();
    await waitFor(() => {
      expect(userService.unfollow).toHaveBeenCalledWith('u1');
    });
  });

  it('rolls back label if follow() rejects', async () => {
    (userService.follow as jest.Mock).mockRejectedValue(new Error('boom'));
    const { getByText, findByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={false} />,
    );
    fireEvent.press(getByText('Follow'));
    expect(await findByText('Follow')).toBeTruthy();
  });
});
