import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Holds the in-flight phone-auth ConfirmationResult between /login and /otp.
// Keeping it in a module-level ref (not search params) means we never serialise
// the Firebase object, which expo-router's typed routes would reject anyway.
let pending: FirebaseAuthTypes.ConfirmationResult | null = null;

export function setPendingConfirmation(c: FirebaseAuthTypes.ConfirmationResult | null) {
  pending = c;
}

export function getPendingConfirmation(): FirebaseAuthTypes.ConfirmationResult | null {
  return pending;
}

export function clearPendingConfirmation() {
  pending = null;
}
