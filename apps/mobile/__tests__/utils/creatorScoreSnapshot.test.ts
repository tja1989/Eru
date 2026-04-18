/**
 * Unit tests for the getOrCreateWeeklySnapshot helper.
 * AsyncStorage is mocked globally in jest.setup.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateWeeklySnapshot } from '@/utils/creatorScoreSnapshot';

// moduleNameMapper @/ already maps to rootDir in jest.config.js.

describe('getOrCreateWeeklySnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('writes a snapshot and returns undefined on first call (no prior snapshot)', async () => {
    const delta = await getOrCreateWeeklySnapshot(75);
    expect(delta).toBeUndefined();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'creatorScore.snapshotAtWeekStart',
      expect.stringContaining('"score":75'),
    );
  });

  it('returns a positive delta when score improved since snapshot', async () => {
    const snap = JSON.stringify({ score: 60, ts: Date.now() - 1000 });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(snap);

    const delta = await getOrCreateWeeklySnapshot(65);
    expect(delta).toBe(5);
  });

  it('returns a negative delta when score dropped since snapshot', async () => {
    const snap = JSON.stringify({ score: 80, ts: Date.now() - 1000 });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(snap);

    const delta = await getOrCreateWeeklySnapshot(77);
    expect(delta).toBe(-3);
  });

  it('resets snapshot and returns undefined on Monday when snapshot is stale', async () => {
    // Force today to be a Monday
    const monday = new Date(2026, 3, 20); // 20 Apr 2026 is a Monday
    jest.useFakeTimers().setSystemTime(monday);

    // Snapshot written last week (Sunday)
    const lastSunday = new Date(2026, 3, 19).getTime();
    const snap = JSON.stringify({ score: 70, ts: lastSunday });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(snap);

    const delta = await getOrCreateWeeklySnapshot(73);
    expect(delta).toBeUndefined();
    expect(AsyncStorage.setItem).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('returns delta normally on Monday when snapshot is already from today', async () => {
    const monday = new Date(2026, 3, 20, 12, 0, 0); // noon Monday
    jest.useFakeTimers().setSystemTime(monday);

    // Snapshot written this morning (still Monday)
    const thisMonday = new Date(2026, 3, 20, 0, 30, 0).getTime();
    const snap = JSON.stringify({ score: 68, ts: thisMonday });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(snap);

    const delta = await getOrCreateWeeklySnapshot(71);
    expect(delta).toBe(3);

    jest.useRealTimers();
  });
});
