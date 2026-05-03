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
    googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? './GoogleService-Info.plist',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Required for Firebase Phone Auth silent-push verification on iOS.
      // Without remote-notification in UIBackgroundModes, iOS won't wake the
      // app to receive APNs silent pushes, forcing Firebase to fall back to
      // reCAPTCHA — which then misroutes the OAuth callback through expo-router
      // and breaks OTP delivery. See:
      //   https://github.com/invertase/react-native-firebase/issues/7577
      //   https://docs.expo.dev/versions/latest/sdk/notifications/
      UIBackgroundModes: ['remote-notification'],
    },
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
    // expo-build-properties MUST be first so its forceStaticLinking takes
    // effect before @react-native-firebase/app autolinks. Per the rnfb
    // maintainer's recommended setup for Expo SDK 54+ with new architecture
    // and useFrameworks: 'static':
    //   https://github.com/invertase/react-native-firebase/issues/8657#issuecomment-3764209769
    //   https://github.com/expo/expo/issues/39607#issuecomment-3337284928
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
        },
        ios: {
          useFrameworks: 'static',
          // Tells expo-build-properties to set $RNFirebaseAsStaticFramework
          // and emit static_framework => true for these RNFB pods, which is
          // what lets RNFB's framework module legally include React-Core
          // headers under the new architecture without -Wnon-modular-include
          // errors. List MUST contain every @react-native-firebase/<module>
          // we depend on; update when adding/removing rnfb packages.
          forceStaticLinking: ['RNFBApp', 'RNFBAuth'],
        },
      },
    ],
    'expo-router',
    'expo-video',
    'expo-dev-client',
    '@react-native-firebase/app',
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
