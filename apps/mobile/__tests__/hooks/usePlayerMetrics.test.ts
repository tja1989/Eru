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
    fireStatus(status: 'idle' | 'loading' | 'readyToPlay' | 'error') {
      listeners.get('statusChange')?.({ status });
    },
  };
}

describe('usePlayerMetrics', () => {
  beforeEach(() => {
    emitMock.mockReset();
    _resetMetricsForTest();
  });

  it('emits ttff on first statusChange→readyToPlay', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-1'));

    act(() => player.fireStatus('readyToPlay'));

    const ttff = emitMock.mock.calls.find((c) => c[0] === 'ttff');
    expect(ttff).toBeDefined();
    expect(ttff![1]).toEqual(expect.objectContaining({
      reelId: 'reel-1',
      durationMs: expect.any(Number),
    }));
  });

  it('emits rebuffer_start when status flips to loading after first ready, and rebuffer_end on next ready', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-2'));

    act(() => player.fireStatus('readyToPlay')); // initial ready → TTFF
    act(() => player.fireStatus('loading'));      // mid-play stall → rebuffer_start
    act(() => player.fireStatus('readyToPlay')); // resume → rebuffer_end

    const events = emitMock.mock.calls.map((c) => c[0]);
    expect(events).toContain('rebuffer_start');
    expect(events).toContain('rebuffer_end');

    const endCall = emitMock.mock.calls.find((c) => c[0] === 'rebuffer_end');
    expect(endCall![1]).toEqual(expect.objectContaining({
      reelId: 'reel-2',
      durationMs: expect.any(Number),
    }));
  });

  it('does NOT count the initial loading→readyToPlay as a rebuffer', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-3'));

    act(() => player.fireStatus('loading'));      // initial buffer (pre-ready) — must NOT emit rebuffer_start
    act(() => player.fireStatus('readyToPlay'));

    const events = emitMock.mock.calls.map((c) => c[0]);
    expect(events).not.toContain('rebuffer_start');
    expect(events).toContain('ttff');
  });

  it('does not double-emit ttff for the same reelId', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-4'));

    act(() => player.fireStatus('readyToPlay'));
    act(() => player.fireStatus('readyToPlay'));

    const ttffEvents = emitMock.mock.calls.filter((c) => c[0] === 'ttff');
    expect(ttffEvents).toHaveLength(1);
  });

  it('null player attaches no listeners', () => {
    const { result } = renderHook(() => usePlayerMetrics(null, 'reel-5'));
    expect(result.current).toBeUndefined();
    expect(emitMock).not.toHaveBeenCalled();
  });
});
