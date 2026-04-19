describe('JS engine config', () => {
  it('app.json declares jsEngine = "hermes"', () => {
    const appJson = require('../../app.json');
    expect(appJson.expo.jsEngine).toBe('hermes');
  });
});
