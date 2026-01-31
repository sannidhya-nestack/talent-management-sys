/**
 * Firebase Client Configuration
 *
 * This module initializes the Firebase client SDK for use in the browser.
 * Used for client-side Firebase operations.
 *
 * Environment variables required:
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

/**
 * Initialize Firebase app (singleton pattern)
 */
function getFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Validate required config
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error('Missing required Firebase configuration. Please check your environment variables.');
  }

  // Initialize only if not already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    app = initializeApp(firebaseConfig);
  }

  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (auth) {
    return auth;
  }

  const firebaseApp = getFirebaseApp();
  auth = getAuth(firebaseApp);
  return auth;
}

/**
 * Get Firebase App instance
 */
export function getFirebaseAppInstance(): FirebaseApp {
  return getFirebaseApp();
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseClientConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}
