import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/lib/analytics', () => ({
  analytics: { emit: jest.fn() },
}));

import { analytics } from '@/lib/analytics';
import { usePlayerMetrics, _resetMetricsForTest } from '@/hooks/usePlayerMetrics';

const emitMock = analytics.emit as jest.Mock;

function makeMockPlayer() {
  const listeners = new Map<string, (v?: unknown) => void>();
  return {
    addListener(event: string, cb: (v?: unknown) => void) {
      listeners.set(event, cb);
      return () => listeners.delete(event);
    },
    fireEvent(event: string, value?: unknown) {
      listeners.get(event)?.(value);
    },
  };
}

describe('usePlayerMetrics', () => {
  beforeEach(() => {
    emitMock.mockReset();
    _resetMetricsForTest();
  });

  it('emits ttff after first readyForDisplay event', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-1'));

    act(() => player.fireEvent('readyForDisplay'));

    const ttff = emitMock.mock.calls.find((c) => c[0] === 'ttff');
    expect(ttff).toBeDefined();
    expect(ttff![1]).toEqual(expect.objectContaining({
      reelId: 'reel-1',
      durationMs: expect.any(Number),
    }));
  });

  it('emits rebuffer_start then rebuffer_end with measured duration', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-2'));

    act(() => player.fireEvent('playbackStalled'));
    act(() => player.fireEvent('playbackStarted'));

    const events = emitMock.mock.calls.map((c) => c[0]);
    expect(events).toContain('rebuffer_start');
    expect(events).toContain('rebuffer_end');

    const endCall = emitMock.mock.calls.find((c) => c[0] === 'rebuffer_end');
    expect(endCall![1]).toEqual(expect.objectContaining({
      reelId: 'reel-2',
      durationMs: expect.any(Number),
    }));
  });

  it('emits bitrate_switch with old + new bitrates', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-3'));

    act(() => player.fireEvent('bitrateChange', { oldBitrate: 800_000, newBitrate: 2_500_000 }));

    const switchCall = emitMock.mock.calls.find((c) => c[0] === 'bitrate_switch');
    expect(switchCall).toBeDefined();
    expect(switchCall![1]).toEqual(expect.objectContaining({
      reelId: 'reel-3',
      oldBitrate: 800_000,
      newBitrate: 2_500_000,
    }));
  });

  it('does not double-emit ttff for the same reelId', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-4'));

    act(() => player.fireEvent('readyForDisplay'));
    act(() => player.fireEvent('readyForDisplay'));

    const ttffEvents = emitMock.mock.calls.filter((c) => c[0] === 'ttff');
    expect(ttffEvents).toHaveLength(1);
  });

  it('null player attaches no listeners (off-active reels)', () => {
    const { result } = renderHook(() => usePlayerMetrics(null, 'reel-5'));
    expect(result.current).toBeUndefined();
    expect(emitMock).not.toHaveBeenCalled();
  });
});
