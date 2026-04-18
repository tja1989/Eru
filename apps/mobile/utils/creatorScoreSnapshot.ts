/**
 * creatorScoreSnapshot.ts
 *
 * Manages a local AsyncStorage snapshot of the creator score taken at the
 * start of each week (Monday 00:00 local time). Used by the CreatorScoreCard
 * to compute the "⬆ +N this week" / "⬇ −N this week" delta chip.
 *
 * MVP approach: snapshot is stored on-device. Swap for a server-side
 * snapshot table when DAU grows and you need cross-device consistency.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'creatorScore.snapshotAtWeekStart';

interface Snapshot {
  score: number;
  /** Unix timestamp (ms) when the snapshot was written */
  ts: number;
}

/**
 * Returns the weekly delta (currentScore − snapshotScore, rounded to integer).
 *
 * Behaviour:
 * - If no snapshot exists: writes one with currentScore and returns undefined
 *   (no delta to show yet).
 * - If today is Monday and the stored snapshot pre-dates today's midnight:
 *   overwrites the snapshot and returns undefined (fresh week, no delta yet).
 * - Otherwise: returns Math.round(currentScore - snapshotScore).
 *
 * @param currentScore  The live creator score (number, 0–100).
 * @returns delta as integer, or undefined when the chip should be hidden.
 */
export async function getOrCreateWeeklySnapshot(
  currentScore: number,
): Promise<number | undefined> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  const today = new Date();
  const isMonday = today.getDay() === 1;
  // Midnight at the start of today (local time)
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (!raw) {
    // First run — write the snapshot and show no delta.
    const snap: Snapshot = { score: currentScore, ts: Date.now() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    return undefined;
  }

  const snap: Snapshot = JSON.parse(raw);

  if (isMonday && new Date(snap.ts) < todayMidnight) {
    // New week has started — reset the snapshot.
    const fresh: Snapshot = { score: currentScore, ts: Date.now() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return undefined;
  }

  // Normal case — compute the delta.
  return Math.round(currentScore - snap.score);
}
