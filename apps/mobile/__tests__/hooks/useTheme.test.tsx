import { renderHook } from '@testing-library/react-native';
import * as RN from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/stores/themeStore';
import { lightColors, darkColors } from '@/constants/themeColors';

describe('useTheme', () => {
  let useColorSchemeSpy: jest.SpyInstance;

  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
    useColorSchemeSpy = jest.spyOn(RN, 'useColorScheme').mockReturnValue('light');
  });

  afterEach(() => {
    useColorSchemeSpy.mockRestore();
  });

  it('returns light colors when mode=system and OS=light', () => {
    useColorSchemeSpy.mockReturnValue('light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(lightColors);
    expect(result.current.scheme).toBe('light');
  });

  it('returns dark colors when mode=system and OS=dark', () => {
    useColorSchemeSpy.mockReturnValue('dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(darkColors);
    expect(result.current.scheme).toBe('dark');
  });

  it('returns dark colors when mode=dark regardless of OS', () => {
    useColorSchemeSpy.mockReturnValue('light');
    useThemeStore.setState({ mode: 'dark' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(darkColors);
    expect(result.current.scheme).toBe('dark');
  });

  it('returns light colors when mode=light regardless of OS', () => {
    useColorSchemeSpy.mockReturnValue('dark');
    useThemeStore.setState({ mode: 'light' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(lightColors);
    expect(result.current.scheme).toBe('light');
  });

  it('falls back to light when mode=system and OS returns null (web)', () => {
    useColorSchemeSpy.mockReturnValue(null);
    useThemeStore.setState({ mode: 'system' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(lightColors);
    expect(result.current.scheme).toBe('light');
  });
});
