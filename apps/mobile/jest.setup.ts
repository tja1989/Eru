import '@testing-library/jest-native/extend-expect';

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: { apiUrl: 'http://test.local/api/v1' },
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const mock = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
  return { __esModule: true, default: mock, ...mock };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
  Stack: { Screen: () => null },
}));

// Prevent axios from being imported during tests — causes stream issues with
// Expo's fetch polyfill in jest-expo. Tests that need API behaviour mock
// `@/services/contentService` directly.
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

// Firebase is only used via our thin wrapper at `@/services/firebase`. Mocking
// the wrapper keeps tests deterministic — no real SDK init, no network calls.
// Individual tests override these with `jest.mocked(...)` when they need
// specific behaviour (e.g. a successful confirmation.confirm()).
jest.mock('@/services/firebase', () => ({
  __esModule: true,
  isFirebaseConfigured: jest.fn(() => true),
  signInWithPhoneNumber: jest.fn(async () => ({
    confirm: jest.fn(async () => ({
      user: { getIdToken: async () => 'firebase-id-token-abc' },
    })),
  })),
  signInWithCustomToken: jest.fn(async () => ({
    user: { getIdToken: async () => 'firebase-id-token-abc' },
  })),
  getCurrentUserIdToken: jest.fn(async () => null),
  firebaseSignOut: jest.fn(async () => {}),
}));

// ConfirmationResult ref between /login → /otp. Tests that exercise the OTP
// screen override `getPendingConfirmation` to return a specific confirm spy.
jest.mock('@/services/pendingConfirmation', () => ({
  __esModule: true,
  getPendingConfirmation: jest.fn(() => null),
  setPendingConfirmation: jest.fn(),
  clearPendingConfirmation: jest.fn(),
}));

// expo-video pulls in a native module that fails to initialize in the jest
// environment. Stub it so components that import it can render.
jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: () => ({
      play: jest.fn(),
      pause: jest.fn(),
      replace: jest.fn(),
      currentTime: 0,
      // expo-video subscriptions return an object with .remove(); some
      // helpers (older usePlayerMetrics) still call the returned value as a
      // function, so make it dual-callable.
      addListener: () => {
        const unsub = () => {};
        (unsub as any).remove = () => {};
        return unsub;
      },
    }),
    VideoView: (props: any) => React.createElement(View, props),
  };
});

// @react-navigation/native's useIsFocused needs a NavigationContainer in the
// React tree, which jest doesn't provide. Default to `true` so screens render
// in their focused/active state. Tests that exercise blur behavior can
// override this at the file level.
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

// NetInfo native module is unavailable in jest. Default to a wifi state so
// hooks that call useNetInfo() resolve to "online + plenty of bandwidth".
// Tests that need a different network shape override this with their own
// jest.mock('@react-native-community/netinfo', ...) at the top of the file.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({ type: 'wifi', isConnected: true, isInternetReachable: true }),
    addEventListener: jest.fn().mockReturnValue(() => {}),
  },
  useNetInfo: () => ({ type: 'wifi', isConnected: true, isInternetReachable: true }),
}));
