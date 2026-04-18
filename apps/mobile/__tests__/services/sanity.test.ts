describe('jest setup', () => {
  it('math works', () => {
    expect(1 + 1).toBe(2);
  });

  it('loads async storage mock without error', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('k', 'v');
    const value = await AsyncStorage.getItem('k');
    expect(value).toBe('v');
  });
});
