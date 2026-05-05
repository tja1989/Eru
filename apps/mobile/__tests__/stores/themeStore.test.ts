import { useThemeStore } from '@/stores/themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
  });

  it('defaults to system mode', () => {
    expect(useThemeStore.getState().mode).toBe('system');
  });

  it('updates mode via setMode', () => {
    useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('accepts the three valid modes', () => {
    const { setMode } = useThemeStore.getState();
    setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
    setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
    setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
  });
});
