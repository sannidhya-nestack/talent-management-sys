'use server';

/**
 * Server Actions for Authentication
 *
 * These actions handle authentication flows and must be defined
 * in a separate file with 'use server' directive.
 */

import { signIn, signOut } from '@/lib/auth';

/**
 * Sign in with Firebase Email/Password
 *
 * Receives the Firebase ID token from client-side authentication
 * and creates a NextAuth session using the credentials provider.
 *
 * @param idToken - Firebase ID token from client-side auth
 * @param email - User's email address
 * @param uid - Firebase user UID
 */
export async function signInWithFirebaseToken(
  idToken: string,
  email: string,
  uid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!idToken || !email || !uid) {
      return { success: false, error: 'Missing required authentication data' };
    }

    // Sign in using the credentials provider
    // The credentials provider will verify and create the session
    await signIn('credentials', {
      idToken,
      email,
      uid,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    console.error('[signInWithFirebaseToken] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Sign out
 *
 * Signs the user out and redirects to the home page.
 */
export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
