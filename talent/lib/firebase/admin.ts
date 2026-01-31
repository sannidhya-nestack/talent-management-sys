/**
 * Firebase Admin SDK Configuration
 *
 * This module initializes the Firebase Admin SDK for server-side operations.
 * Used for:
 * - User management
 * - Custom claims management
 * - User authentication verification
 *
 * Environment variables required:
 * - FIREBASE_ADMIN_PRIVATE_KEY: Service account private key
 * - FIREBASE_ADMIN_CLIENT_EMAIL: Service account client email
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID: Firebase project ID
 *
 * Note: The private key should be stored as a base64-encoded string or as-is.
 * If stored with escaped newlines, they will be handled automatically.
 */

import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;

/**
 * Initialize Firebase Admin app (singleton pattern)
 */
function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Validate required environment variables
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      'Missing required Firebase Admin configuration. Please set FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables.'
    );
  }

  // Handle private key formatting (replace escaped newlines if present)
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  };

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });

  return adminApp;
}

/**
 * Get Firebase Admin Auth instance
 */
export function getFirebaseAdminAuth(): Auth {
  if (adminAuth) {
    return adminAuth;
  }

  const app = getFirebaseAdminApp();
  adminAuth = getAuth(app);
  return adminAuth;
}

/**
 * Get Firebase Admin App instance
 */
export function getFirebaseAdminAppInstance(): App {
  return getFirebaseAdminApp();
}

/**
 * Check if Firebase Admin is configured
 */
export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}
