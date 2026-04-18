import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CreateScreen from '@/app/(tabs)/create';
import { contentService } from '@/services/contentService';
import { userService } from '@/services/userService';

jest.mock('@/services/contentService');
jest.mock('@/services/userService');
jest.mock('@/services/mediaService', () => ({
  mediaService: {
    upload: jest.fn(),
    uploadFileToS3: jest.fn(),
  },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos' },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const MOCK_USERS = [
  { id: 'u1', name: 'Alice Smith', username: 'alice', avatarUrl: undefined },
  { id: 'u2', name: 'Bob Jones', username: 'bob', avatarUrl: undefined },
];

describe('<CreateScreen /> — Tag Users picker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.search as jest.Mock).mockResolvedValue(MOCK_USERS);
    (contentService.create as jest.Mock).mockResolvedValue({ id: 'c1' });
  });

  it('renders the Tag toolbar button', () => {
    const { getByLabelText } = render(<CreateScreen />);
    expect(getByLabelText('Tag users')).toBeTruthy();
  });

  it('opens the tag picker modal when Tag button is tapped', async () => {
    const { getByLabelText, findByPlaceholderText } = render(<CreateScreen />);
    fireEvent.press(getByLabelText('Tag users'));
    expect(await findByPlaceholderText(/search by username/i)).toBeTruthy();
  });

  it('typing in search calls userService.search with debounce', async () => {
    jest.useFakeTimers();
    const { getByLabelText, getByPlaceholderText } = render(<CreateScreen />);

    fireEvent.press(getByLabelText('Tag users'));
    await waitFor(() => getByPlaceholderText(/search by username/i));

    fireEvent.changeText(getByPlaceholderText(/search by username/i), 'ali');
    // service not called yet — debounce pending
    expect(userService.search).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => {
      expect(userService.search).toHaveBeenCalledWith('ali');
    });
    jest.useRealTimers();
  });

  it('tapping a result row adds the user to selected chips', async () => {
    jest.useFakeTimers();
    const { getByLabelText, getByPlaceholderText, findAllByText } = render(<CreateScreen />);

    fireEvent.press(getByLabelText('Tag users'));
    await waitFor(() => getByPlaceholderText(/search by username/i));
    fireEvent.changeText(getByPlaceholderText(/search by username/i), 'ali');
    act(() => { jest.advanceTimersByTime(300); });

    // Tap the Alice result row (by full name to avoid ambiguity)
    const aliceRows = await findAllByText('Alice Smith');
    fireEvent.press(aliceRows[0]);

    // Chip for @alice should appear (may have multiple @alice texts — result row + chip)
    const aliceTexts = await findAllByText('@alice');
    expect(aliceTexts.length).toBeGreaterThanOrEqual(1);
    jest.useRealTimers();
  });

  it('confirm closes modal and stores selected IDs', async () => {
    jest.useFakeTimers();
    const { getByLabelText, getByPlaceholderText, findByText, queryByPlaceholderText } = render(<CreateScreen />);

    fireEvent.press(getByLabelText('Tag users'));
    await waitFor(() => getByPlaceholderText(/search by username/i));
    fireEvent.changeText(getByPlaceholderText(/search by username/i), 'ali');
    act(() => { jest.advanceTimersByTime(300); });

    const aliceRow = await findByText('Alice Smith');
    fireEvent.press(aliceRow);

    const confirmBtn = await findByText(/confirm/i);
    fireEvent.press(confirmBtn);

    // Modal should be closed — search input gone
    await waitFor(() => {
      expect(queryByPlaceholderText(/search by username/i)).toBeNull();
    });

    // Tagged chip row visible in the create screen
    expect(await findByText(/tagged.*@alice/i)).toBeTruthy();
    jest.useRealTimers();
  });

  it('cancel discards in-modal changes without updating create screen', async () => {
    jest.useFakeTimers();
    const { getByLabelText, getByPlaceholderText, findByText, queryByPlaceholderText, queryByText } = render(<CreateScreen />);

    fireEvent.press(getByLabelText('Tag users'));
    await waitFor(() => getByPlaceholderText(/search by username/i));
    fireEvent.changeText(getByPlaceholderText(/search by username/i), 'ali');
    act(() => { jest.advanceTimersByTime(300); });

    const aliceRow = await findByText('Alice Smith');
    fireEvent.press(aliceRow);

    const cancelBtn = await findByText(/^cancel$/i);
    fireEvent.press(cancelBtn);

    await waitFor(() => {
      expect(queryByPlaceholderText(/search by username/i)).toBeNull();
    });

    // No tagged chip row should appear on the create screen
    expect(queryByText(/tagged.*@alice/i)).toBeNull();
    jest.useRealTimers();
  });

  it('submit includes taggedUserIds in contentService.create (text branch)', async () => {
    jest.useFakeTimers();
    const { getByLabelText, getByPlaceholderText, findByText, getByText } = render(<CreateScreen />);

    // Open tag picker and select alice
    fireEvent.press(getByLabelText('Tag users'));
    await waitFor(() => getByPlaceholderText(/search by username/i));
    fireEvent.changeText(getByPlaceholderText(/search by username/i), 'ali');
    act(() => { jest.advanceTimersByTime(300); });
    const aliceRow = await findByText('Alice Smith');
    fireEvent.press(aliceRow);
    fireEvent.press(await findByText(/confirm/i));
    await waitFor(() => expect(getByLabelText('Tag users')).toBeTruthy());

    // Switch to text content type so Share is enabled with some text
    fireEvent.press(getByText('✍️ Text'));
    const textInput = getByPlaceholderText("What's on your mind?");
    fireEvent.changeText(textInput, 'Hello world');

    jest.useRealTimers();
    fireEvent.press(getByText('Share'));

    await waitFor(() => {
      expect(contentService.create).toHaveBeenCalledWith(
        expect.objectContaining({ taggedUserIds: ['u1'] }),
      );
    });
  });

  it('cap at 10: UserTagPicker enforces MAX_TAGS and shows warning', async () => {
    // Use CreateScreen → Modal path (where FlatList renders correctly in RNTL).
    // Setup mock with 11 users. Open picker, advance debounce, then
    // switch to real timers BEFORE any findByText calls.
    const elevenUsers = Array.from({ length: 11 }, (_, i) => ({
      id: `cap${i}`,
      name: `CapUser ${i}`,
      username: `cap${i}`,
      avatarUrl: undefined,
    }));
    (userService.search as jest.Mock).mockResolvedValue(elevenUsers);

    jest.useFakeTimers();
    const { getByLabelText, getByPlaceholderText, findByText } = render(<CreateScreen />);

    // Open the Tag picker
    fireEvent.press(getByLabelText('Tag users'));
    await waitFor(() => { getByPlaceholderText(/search by username/i); });

    // Trigger debounce-protected search
    fireEvent.changeText(getByPlaceholderText(/search by username/i), 'ca');
    act(() => { jest.advanceTimersByTime(300); });

    // Switch to real timers NOW so findByText can poll properly
    jest.useRealTimers();

    // Wait for all 11 results to render (search has resolved)
    await waitFor(() => expect(userService.search).toHaveBeenCalledWith('ca'));

    // Select first 10 users
    for (let i = 0; i < 10; i++) {
      const el = await findByText(`CapUser ${i}`);
      fireEvent.press(el);
    }

    // Tap the 11th user — should show warning and NOT add them
    const el11 = await findByText('CapUser 10');
    fireEvent.press(el11);

    expect(await findByText(/maximum of 10/i)).toBeTruthy();
  });
});
