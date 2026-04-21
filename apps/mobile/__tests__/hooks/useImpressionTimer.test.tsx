import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useImpressionTimer } from '@/hooks/useImpressionTimer';

describe('useImpressionTimer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fires onImpression after thresholdMs when enabled=true', () => {
    const onImpression = jest.fn();
    renderHook(() => useImpressionTimer({ enabled: true, thresholdMs: 2000, onImpression }));
    expect(onImpression).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(onImpression).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire if enabled=false the whole time', () => {
    const onImpression = jest.fn();
    renderHook(() => useImpressionTimer({ enabled: false, thresholdMs: 2000, onImpression }));
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onImpression).not.toHaveBeenCalled();
  });

  it('cancels the timer when enabled flips to false before threshold', () => {
    const onImpression = jest.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useImpressionTimer({ enabled, thresholdMs: 2000, onImpression }),
      { initialProps: { enabled: true } },
    );
    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ enabled: false });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onImpression).not.toHaveBeenCalled();
  });

  it('fires only once per component lifetime even if enabled toggles', () => {
    const onImpression = jest.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useImpressionTimer({ enabled, thresholdMs: 2000, onImpression }),
      { initialProps: { enabled: true } },
    );
    act(() => { jest.advanceTimersByTime(2500); });
    expect(onImpression).toHaveBeenCalledTimes(1);

    // Flip off, flip back on — should stay at 1 call
    rerender({ enabled: false });
    rerender({ enabled: true });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onImpression).toHaveBeenCalledTimes(1);
  });
});
