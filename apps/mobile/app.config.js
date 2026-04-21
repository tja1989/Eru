// Dynamic Expo config. Reads env vars at evaluation time — required so EAS
// Build can inject the `GOOGLE_SERVICES_JSON` secret file variable into
// `android.googleServicesFile`. A static `app.json` cannot interpolate env
// vars, and Firebase Phone Auth's native SDK reads `google-services.json` at
// build time, so the path must be resolved before EAS runs the Android build.
//
// Local development (`expo start`) uses `./google-services.json` directly
// (gitignored). EAS development/production builds override it with the value
// of `$GOOGLE_SERVICES_JSON`, which EAS writes to a temp file it created
// from the secret variable's contents.

/** @type {import('@expo/config-types').ExpoConfig} */
module.exports = {
  name: 'Eru',
  slug: 'eru',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'eru',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  jsEngine: 'hermes',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FAFAFA',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.eru.consumer',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FAFAFA',
    },
    package: 'app.eru.consumer',
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  plugins: [
    'expo-router',
    'expo-video',
    'expo-dev-client',
    '@react-native-firebase/app',
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
        },
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  web: {
    bundler: 'metro',
  },
  extra: {
    router: {},
    eas: {
      projectId: '5fb96f5e-8595-40ac-a854-07f89029aa07',
    },
  },
  owner: 'eru_aflo',
};
