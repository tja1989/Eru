describe('JS engine config', () => {
  it('app.config.js declares jsEngine = "hermes"', () => {
    // app.config.js is the dynamic Expo config (replaced app.json when we
    // wired @react-native-firebase + the GOOGLE_SERVICES_JSON secret env).
    const config = require('../../app.config.js');
    expect(config.jsEngine).toBe('hermes');
  });
});
