import { renderHook } from '@testing-library/react-native';
import { useReelPreloader, preloadCountForBandwidth } from '@/hooks/useReelPreloader';

const netInfoState: { current: any } = {
  current: { type: 'wifi', isConnected: true, isInternetReachable: true },
};

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => netInfoState.current,
}));

describe('preloadCountForBandwidth (pure)', () => {
  it('0 when offline (type=none or isConnected=false)', () => {
    expect(preloadCountForBandwidth({ type: 'none' })).toBe(0);
    expect(preloadCountForBandwidth({ type: 'wifi', isConnected: false })).toBe(0);
  });

  it('3 on wifi', () => {
    expect(preloadCountForBandwidth({ type: 'wifi' })).toBe(3);
  });

  it('cellularGeneration ladder: 2g→0, 3g→1, 4g→2, 5g→2', () => {
    expect(preloadCountForBandwidth({ type: 'cellular', details: { cellularGeneration: '2g' } })).toBe(0);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { cellularGeneration: '3g' } })).toBe(1);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { cellularGeneration: '4g' } })).toBe(2);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { cellularGeneration: '5g' } })).toBe(2);
  });

  it('downlinkMbps overrides cellularGeneration: <1→0, <3→1, <6→2, ≥6→3', () => {
    expect(preloadCountForBandwidth({ type: 'cellular', details: { downlinkMbps: 0.5 } })).toBe(0);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { downlinkMbps: 2 } })).toBe(1);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { downlinkMbps: 5 } })).toBe(2);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { downlinkMbps: 10 } })).toBe(3);
  });

  it('unknown cellular details → conservative 1', () => {
    expect(preloadCountForBandwidth({ type: 'cellular' })).toBe(1);
  });
});

describe('useReelPreloader', () => {
  it('on wifi at activeIndex=5: returns [4, 6, 7, 8] (one behind + three ahead)', () => {
    netInfoState.current = { type: 'wifi', isConnected: true, isInternetReachable: true };
    const { result } = renderHook(() => useReelPreloader({ activeIndex: 5 }));
    expect(result.current.indicesToPreload.sort((a, b) => a - b)).toEqual([4, 6, 7, 8]);
  });

  it('shrinks to one ahead on 3g', () => {
    netInfoState.current = { type: 'cellular', details: { cellularGeneration: '3g' }, isConnected: true };
    const { result } = renderHook(() => useReelPreloader({ activeIndex: 5 }));
    expect(result.current.indicesToPreload).toEqual([6]);
  });

  it('empty when offline', () => {
    netInfoState.current = { type: 'none', isConnected: false };
    const { result } = renderHook(() => useReelPreloader({ activeIndex: 5 }));
    expect(result.current.indicesToPreload).toEqual([]);
  });

  it('does not return negative indices at activeIndex=0 on wifi', () => {
    netInfoState.current = { type: 'wifi', isConnected: true };
    const { result } = renderHook(() => useReelPreloader({ activeIndex: 0 }));
    expect(result.current.indicesToPreload.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
});
