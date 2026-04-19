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
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

// Firebase is only used via our thin wrapper at `@/services/firebase`. Mocking
// the wrapper keeps tests deterministic — no real SDK init, no network calls.
// Individual tests can override `signInWithCredential` / `getFirebaseAuth`
// with `jest.mocked(...)` as needed.
jest.mock('@/services/firebase', () => ({
  __esModule: true,
  getFirebaseAuth: jest.fn(() => ({})),
  isFirebaseConfigured: jest.fn(() => false),
  PhoneAuthProvider: {
    credential: jest.fn((verificationId: string, code: string) => ({
      verificationId,
      code,
    })),
  },
  signInWithCredential: jest.fn(async () => ({
    user: { getIdToken: async () => 'firebase-id-token-abc' },
  })),
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
      // usePlayerMetrics subscribes via addListener — return a no-op
      // unsubscribe so tests that don't care about metrics still mount.
      addListener: () => () => {},
    }),
    VideoView: (props: any) => React.createElement(View, props),
  };
});

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
