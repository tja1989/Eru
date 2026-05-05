import { renderHook } from '@testing-library/react-native';
import * as RN from 'react-native';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useThemeStore } from '@/stores/themeStore';
import { ThemeColors } from '@/constants/themeColors';

describe('useThemedStyles', () => {
  let useColorSchemeSpy: jest.SpyInstance;

  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
    useColorSchemeSpy = jest.spyOn(RN, 'useColorScheme').mockReturnValue('light');
  });

  afterEach(() => {
    useColorSchemeSpy.mockRestore();
  });

  it('produces a StyleSheet with the active palette injected', () => {
    const factory = (c: ThemeColors) => ({
      wrap: { backgroundColor: c.bg, color: c.g900 },
    });
    const { result } = renderHook(() => useThemedStyles(factory));
    expect(result.current.wrap).toBeDefined();
  });

  it('memoizes the StyleSheet across renders within the same theme', () => {
    const factory = (c: ThemeColors) => ({ wrap: { backgroundColor: c.bg } });
    const { result, rerender } = renderHook(() => useThemedStyles(factory));
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });

  it('produces a different StyleSheet when the active palette changes', () => {
    useColorSchemeSpy.mockReturnValue('light');
    const factory = (c: ThemeColors) => ({ wrap: { backgroundColor: c.bg } });
    const { result, rerender } = renderHook(() => useThemedStyles(factory));
    const lightStyles = result.current;

    useColorSchemeSpy.mockReturnValue('dark');
    rerender({});
    expect(result.current).not.toBe(lightStyles);
  });
});
