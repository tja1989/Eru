import admin from 'firebase-admin';
import { getConfig } from '../config/index.js';

let initialized = false;

export function getFirebaseAdmin(): typeof admin {
  if (!initialized) {
    const config = getConfig();
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FIREBASE_PROJECT_ID,
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
        privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
  }
  return admin;
}

export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken> {
  const fb = getFirebaseAdmin();
  return fb.auth().verifyIdToken(token);
}
