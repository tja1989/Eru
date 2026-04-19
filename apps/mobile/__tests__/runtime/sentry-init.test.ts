const mockSentryInit = jest.fn();
jest.mock('@sentry/react-native', () => ({
  init: mockSentryInit,
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  setMeasurement: jest.fn(),
}));

import { initSentry, _resetSentryInitForTests } from '@/lib/sentryInit';

describe('Mobile Sentry init', () => {
  beforeEach(() => {
    mockSentryInit.mockReset();
    _resetSentryInitForTests();
  });

  it('calls Sentry.init when EXPO_PUBLIC_SENTRY_DSN is set', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/123';
    initSentry();
    expect(mockSentryInit).toHaveBeenCalled();
    expect(mockSentryInit.mock.calls[0][0].dsn).toBe('https://abc@sentry.io/123');
  });

  it('no-ops when DSN missing', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    initSentry();
    expect(mockSentryInit).not.toHaveBeenCalled();
  });

  it('only initialises once even when called repeatedly', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/123';
    initSentry();
    initSentry();
    initSentry();
    expect(mockSentryInit).toHaveBeenCalledTimes(1);
  });
});
