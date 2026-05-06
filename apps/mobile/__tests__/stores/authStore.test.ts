// Regression tests for the `setUser` wrapper. History: setUser used to be
// a blunt overwrite — `set({ user })`. Call sites doing
// `setUser({ ...user, name, username })` could blank `needsHandleChoice` to
// undefined whenever the spread source lacked the field. Combined with
// useAuth's old `?? true` fail-safe, that produced a Personalize redirect
// loop. The wrapper preserves the most recent known value if the caller
// omits it. Even after flipping the useAuth fail-safe to `?? false`,
// preserving the field here keeps the route guard's input truthful.

// Mock AsyncStorage before importing the store, otherwise persist middleware
// tries to read from a real RN module that isn't available in node.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock api so the side-effecting imports (registerOnUnauthorized) don't trip.
jest.mock('@/services/api', () => ({
  setAuthToken: jest.fn(),
  registerOnUnauthorized: jest.fn(),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

import { useAuthStore } from '@/stores/authStore';

const baseUser = {
  id: 'u-1',
  name: 'Alpha',
  username: 'alpha',
  phone: '+9100',
  tier: 'explorer',
  currentBalance: 0,
  needsHandleChoice: false,
};

describe('authStore.setUser — needsHandleChoice preservation', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('preserves prior needsHandleChoice when caller omits the field', () => {
    useAuthStore.getState().setUser(baseUser);
    expect(useAuthStore.getState().user?.needsHandleChoice).toBe(false);

    // Simulating an edit-profile-style update that spreads from a fetched
    // object without the field. Without the wrapper, this overwrites the
    // existing `false` with `undefined`, which the route guard's old
    // fail-safe interpreted as "needs handle". Loop.
    useAuthStore.getState().setUser({ ...baseUser, name: 'Renamed', needsHandleChoice: undefined as unknown as boolean });
    expect(useAuthStore.getState().user?.name).toBe('Renamed');
    expect(useAuthStore.getState().user?.needsHandleChoice).toBe(false);
  });

  it('respects an explicit true override', () => {
    useAuthStore.getState().setUser(baseUser);
    useAuthStore.getState().setUser({ ...baseUser, needsHandleChoice: true });
    expect(useAuthStore.getState().user?.needsHandleChoice).toBe(true);
  });

  it('respects an explicit false override', () => {
    useAuthStore.getState().setUser({ ...baseUser, needsHandleChoice: true });
    useAuthStore.getState().setUser({ ...baseUser, needsHandleChoice: false });
    expect(useAuthStore.getState().user?.needsHandleChoice).toBe(false);
  });

  it('defaults to false when there is no prior value AND caller omits the field', () => {
    useAuthStore.setState({ user: null });
    useAuthStore.getState().setUser({ ...baseUser, needsHandleChoice: undefined as unknown as boolean });
    expect(useAuthStore.getState().user?.needsHandleChoice).toBe(false);
  });

  it('clearing user sets it to null cleanly', () => {
    useAuthStore.getState().setUser(baseUser);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
