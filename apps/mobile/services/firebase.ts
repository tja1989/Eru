import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Native SDK reads google-services.json at build time and auto-initializes.
// Returning true means the caller can unconditionally use Firebase — if the
// native config is missing, the app crashes at startup long before we get here.
export function isFirebaseConfigured(): boolean {
  return true;
}

export function signInWithPhoneNumber(
  formattedPhone: string,
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  return auth().signInWithPhoneNumber(formattedPhone);
}

// `signInWithCustomToken` is kept for the WhatsApp OTP flow — Gupshup returns
// a Firebase custom token that we exchange here for a normal Firebase session.
export function signInWithCustomToken(token: string) {
  return auth().signInWithCustomToken(token);
}

export function getCurrentUserIdToken(): Promise<string | null> {
  const user = auth().currentUser;
  return user ? user.getIdToken() : Promise.resolve(null);
}

export async function firebaseSignOut(): Promise<void> {
  const user = auth().currentUser;
  if (user) await auth().signOut();
}
