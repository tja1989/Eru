import { describe, it, expect, vi, beforeEach } from 'vitest';

const setMeasurementMock = vi.fn();
let setMeasurementBehavior: 'forward' | 'throw' | 'undefined' = 'forward';

vi.mock('@sentry/node', () => ({
  setMeasurement: (name: string, value: number, unit: string) => {
    if (setMeasurementBehavior === 'undefined') return undefined;
    if (setMeasurementBehavior === 'throw') throw new Error('No active span');
    setMeasurementMock(name, value, unit);
  },
}));

const { emitGauge } = await import('../../src/utils/metrics.js');

describe('metrics.emitGauge', () => {
  beforeEach(() => {
    setMeasurementMock.mockReset();
    setMeasurementBehavior = 'forward';
  });

  it('forwards to Sentry.setMeasurement when available', () => {
    emitGauge('pending_transcodes', 7);
    expect(setMeasurementMock).toHaveBeenCalledWith('pending_transcodes', 7, 'none');
  });

  it('forwards a custom unit when provided', () => {
    emitGauge('cold_start_ms', 1234, 'millisecond');
    expect(setMeasurementMock).toHaveBeenCalledWith('cold_start_ms', 1234, 'millisecond');
  });

  it('does not throw when Sentry has no active span', () => {
    setMeasurementBehavior = 'throw';
    expect(() => emitGauge('foo', 1)).not.toThrow();
  });
});
