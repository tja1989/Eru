import {
  startColdStartMeter,
  completeColdStartMeter,
  getColdStartDuration,
  _resetColdStartMeterForTests,
} from '@/lib/coldStartMeter';

describe('coldStartMeter', () => {
  beforeEach(() => {
    _resetColdStartMeterForTests();
  });

  it('returns undefined before completion', () => {
    startColdStartMeter();
    expect(getColdStartDuration()).toBeUndefined();
  });

  it('returns a numeric duration after completion', () => {
    startColdStartMeter();
    completeColdStartMeter();
    const d = getColdStartDuration();
    expect(typeof d).toBe('number');
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it('completing twice keeps the first measurement', () => {
    startColdStartMeter();
    completeColdStartMeter();
    const d1 = getColdStartDuration();
    completeColdStartMeter();
    const d2 = getColdStartDuration();
    expect(d2).toBe(d1);
  });

  it('returns undefined if never started', () => {
    completeColdStartMeter();
    expect(getColdStartDuration()).toBeUndefined();
  });
});
