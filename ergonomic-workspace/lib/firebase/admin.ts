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
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let firestore: Firestore | undefined;

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
    const missing = [];
    if (!privateKey) missing.push('FIREBASE_ADMIN_PRIVATE_KEY');
    if (!clientEmail) missing.push('FIREBASE_ADMIN_CLIENT_EMAIL');
    if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    
    throw new Error(
      `Missing required Firebase Admin configuration. Please set the following environment variables in your .env file:\n` +
      `  - ${missing.join('\n  - ')}\n\n` +
      `To get these values:\n` +
      `1. Go to Firebase Console (https://console.firebase.google.com)\n` +
      `2. Select your project\n` +
      `3. Go to Project Settings > Service Accounts\n` +
      `4. Click "Generate new private key" to download the service account JSON\n` +
      `5. Extract the values and add them to your .env file\n\n` +
      `For FIREBASE_ADMIN_PRIVATE_KEY, copy the entire "private_key" value from the JSON, including the BEGIN/END markers.`
    );
  }

  // Check if private key looks like placeholder
  if (privateKey.includes('your-private-key') || privateKey.includes('your-firebase')) {
    throw new Error(
      'FIREBASE_ADMIN_PRIVATE_KEY appears to be a placeholder. Please replace it with your actual Firebase service account private key from the Firebase Console.'
    );
  }

  // Handle private key formatting
  // The private key from Firebase can be in various formats when stored in .env
  let formattedPrivateKey = privateKey.trim();
  
  // Remove any surrounding quotes if present
  formattedPrivateKey = formattedPrivateKey.replace(/^["']|["']$/g, '');
  
  // Handle different newline formats
  // Case 1: Escaped newlines in string (\\n)
  if (formattedPrivateKey.includes('\\n')) {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
  }
  // Case 2: Already has actual newlines (shouldn't happen in .env but handle it)
  else if (formattedPrivateKey.includes('\n')) {
    // Already has newlines, keep as is
  }
  // Case 3: Single line - try to add newlines around markers
  else if (formattedPrivateKey.includes('BEGIN PRIVATE KEY') && formattedPrivateKey.includes('END PRIVATE KEY')) {
    // Try to intelligently add newlines
    formattedPrivateKey = formattedPrivateKey
      .replace(/(-----BEGIN PRIVATE KEY-----)/, '$1\n')
      .replace(/(-----END PRIVATE KEY-----)/, '\n$1');
  }
  
  // Clean up any double newlines
  formattedPrivateKey = formattedPrivateKey.replace(/\n\n+/g, '\n');
  
  // Ensure the key has proper format
  if (!formattedPrivateKey.includes('BEGIN PRIVATE KEY') || !formattedPrivateKey.includes('END PRIVATE KEY')) {
    throw new Error(
      'Invalid FIREBASE_ADMIN_PRIVATE_KEY format. The private key must include ' +
      '"-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----" markers.\n\n' +
      'Make sure you:\n' +
      '1. Copied the ENTIRE "private_key" value from the Firebase service account JSON file\n' +
      '2. Kept all the \\n characters as they are\n' +
      '3. Wrapped the value in double quotes in your .env file\n\n' +
      'Example format:\n' +
      'FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"'
    );
  }
  
  // Validate key structure
  const beginMarker = '-----BEGIN PRIVATE KEY-----';
  const endMarker = '-----END PRIVATE KEY-----';
  
  // Trim whitespace for validation
  const trimmedKey = formattedPrivateKey.trim();
  
  if (!trimmedKey.startsWith(beginMarker)) {
    throw new Error(
      `FIREBASE_ADMIN_PRIVATE_KEY must start with "${beginMarker}". ` +
      'Make sure you copied the entire key including the BEGIN marker.\n\n' +
      'The key should start like this:\n' +
      'FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...'
    );
  }
  
  // Check if END marker exists (allowing for trailing newlines/whitespace)
  if (!trimmedKey.includes(endMarker)) {
    throw new Error(
      `FIREBASE_ADMIN_PRIVATE_KEY must include "${endMarker}". ` +
      'Make sure you copied the ENTIRE key from the JSON file, including the END marker.\n\n' +
      'The key should end like this:\n' +
      '...\\n-----END PRIVATE KEY-----\\n"\n\n' +
      'Common mistake: The key is very long (~2000+ characters). Make sure you copied ALL of it, ' +
      'not just the beginning part.'
    );
  }
  
  // Check if END marker is at the end (allowing for trailing newline)
  if (!trimmedKey.endsWith(endMarker) && !trimmedKey.endsWith(endMarker + '\n')) {
    // END marker exists but not at the end - might have extra content
    const endIndex = trimmedKey.lastIndexOf(endMarker);
    const afterEnd = trimmedKey.substring(endIndex + endMarker.length).trim();
    if (afterEnd) {
      throw new Error(
        `FIREBASE_ADMIN_PRIVATE_KEY has content after "${endMarker}": "${afterEnd.substring(0, 50)}..."\n\n` +
        'This suggests the key might be malformed or you have extra content. ' +
        'Make sure the key ends with the END marker (optionally followed by a newline).'
      );
    }
  }
  
  // Use trimmed version for actual use
  formattedPrivateKey = trimmedKey;

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  };

  try {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('DECODER') || errorMessage.includes('unsupported')) {
      throw new Error(
        'Failed to parse FIREBASE_ADMIN_PRIVATE_KEY. This usually means the key format is incorrect.\n\n' +
        'Common issues:\n' +
        '1. Missing or incorrect BEGIN/END markers\n' +
        '2. Incorrect newline handling (\\n vs actual newlines)\n' +
        '3. Extra spaces or characters\n' +
        '4. Key was truncated or corrupted\n\n' +
        'Solution:\n' +
        '1. Go to Firebase Console > Project Settings > Service Accounts\n' +
        '2. Generate a new private key\n' +
        '3. Copy the ENTIRE "private_key" value from the JSON file\n' +
        '4. Paste it into your .env file, keeping all \\n characters\n' +
        '5. Make sure it\'s wrapped in double quotes\n\n' +
        `Original error: ${errorMessage}`
      );
    }
    
    throw error;
  }

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
 * Get Firestore instance
 */
export function getFirestoreInstance(): Firestore {
  if (firestore) {
    return firestore;
  }

  const app = getFirebaseAdminApp();
  firestore = getFirestore(app);
  return firestore;
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
