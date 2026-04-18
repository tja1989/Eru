import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  PhoneAuthProvider,
  signInWithCredential,
  type Auth,
} from 'firebase/auth';
import Constants from 'expo-constants';

// Firebase config is provided via app.json → expo.extra.firebase. Values are
// placeholder strings (`__REPLACE_ME__` …) until a real Firebase project is
// wired in; consumers should check `isFirebaseConfigured()` before attempting
// to hit the SDK at runtime.
const cfg = (Constants.expoConfig?.extra as any)?.firebase;

let auth: Auth | null = null;

export function isFirebaseConfigured(): boolean {
  if (!cfg) return false;
  const placeholder = (v: unknown) =>
    typeof v !== 'string' || v.length === 0 || v.includes('__REPLACE_ME__');
  return !placeholder(cfg.apiKey) && !placeholder(cfg.projectId) && !placeholder(cfg.appId);
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const app = getApps()[0] ?? initializeApp(cfg);
    auth = getAuth(app);
  }
  return auth;
}

export { PhoneAuthProvider, signInWithCredential };
