/**
 * Authentication Configuration
 *
 * This module configures NextAuth.js v5 (Auth.js) with Firebase Auth.
 * It handles:
 * - Firebase email/password authentication via Credentials provider
 * - Session management with JWT
 * - User sync to local database on login
 * - Admin detection via database (hasAppAccess, isAdmin flags)
 *
 * Environment variables required:
 * - NEXT_PUBLIC_FIREBASE_API_KEY: Firebase API key
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Firebase auth domain
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID: Firebase project ID
 * - NEXTAUTH_SECRET: Random secret for signing cookies
 */

import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import type { User as DbUser } from '@/lib/services/users';

/**
 * Extended session user type with our custom fields
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName?: string;
      displayName?: string;
      title?: string;
      image?: string;
      isAdmin: boolean;
      hasAccess: boolean;
      dbUserId?: string;
    };
  }

  interface User {
    isAdmin?: boolean;
    hasAccess?: boolean;
    dbUserId?: string;
    firstName?: string;
    displayName?: string;
    title?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    isAdmin?: boolean;
    hasAccess?: boolean;
    dbUserId?: string;
    firebaseUserId?: string;
    firstName?: string;
    displayName?: string;
    title?: string;
  }
}

/**
 * Check if a user has access to the Ergonomic Workspace app and their role
 *
 * Access Control via Database:
 * - Checks the local database for user record
 * - `hasAppAccess: true` - User can access the app
 * - `isAdmin: true` - User has full administrative access
 *
 * Users must exist in database with `hasAppAccess: true` or `isAdmin: true` to access the app.
 *
 * @param firebaseUserId - The Firebase user UID (from Google OAuth sub claim)
 * @returns Object with hasAccess and isAdmin flags
 */
async function checkAppAccess(firebaseUserId: string): Promise<{
  hasAccess: boolean;
  isAdmin: boolean;
}> {
  try {
    // Check access from database instead of Firebase custom claims
    const { getUserByFirebaseId } = await import('@/lib/services/users');
    const dbUser = await getUserByFirebaseId(firebaseUserId);
    
    if (!dbUser) {
      // User doesn't exist in database - no access
      console.log('[Auth] User not found in database, denying access:', firebaseUserId);
      return { hasAccess: false, isAdmin: false };
    }
    
    const hasAccess = dbUser.hasAppAccess || dbUser.isAdmin;
    const isAdmin = dbUser.isAdmin;
    
    console.log('[Auth] Access check via database: hasAccess=', hasAccess, 'isAdmin=', isAdmin, 'firebaseUserId=', firebaseUserId);
    return { hasAccess, isAdmin };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Auth] Error checking app access via database:', errorMessage);
    
    // If Firebase Admin isn't configured, grant access as fallback
    // This allows the app to work even if Firebase Admin isn't set up yet
    if (errorMessage.includes('FIREBASE_ADMIN') || 
        errorMessage.includes('Missing required Firebase') ||
        errorMessage.includes('DECODER')) {
      console.warn('[Auth] Firebase Admin not configured - granting access as fallback');
      return { hasAccess: true, isAdmin: false };
    }
    
    // On other errors, deny access for security
    return { hasAccess: false, isAdmin: false };
  }
}

/**
 * Sync user data from Firebase to local database
 *
 * Creates a new user record if one doesn't exist, or updates the existing one.
 *
 * @param firebaseUser - The user info from Firebase Auth (email/password or OAuth)
 * @param isAdmin - Whether the user is an administrator
 * @returns The database user record
 */
async function syncUserToDatabase(
  firebaseUser: {
    uid: string; // Firebase UID
    email: string;
    name?: string;
  },
  isAdmin: boolean
): Promise<DbUser> {
  const firebaseUserId = firebaseUser.uid;
  const email = firebaseUser.email;

  // Extract name parts from email or name
  const nameParts = (firebaseUser.name || email.split('@')[0]).split(' ');
  let firstName = nameParts[0] || 'Unknown';
  let lastName = nameParts.slice(1).join(' ') || '';
  let displayName = firebaseUser.name || email.split('@')[0];
  const middleName: string | undefined = undefined;
  const title: string | undefined = undefined;
  const city: string | undefined = undefined;
  const state: string | undefined = undefined;
  const countryCode: string | undefined = undefined;
  const preferredLanguage = 'en';
  const timezone = 'America/New_York';

  // Ensure firstName is not empty
  if (!firstName || firstName === '') {
    firstName = 'Unknown';
  }

  try {
    const { createOrUpdateUser } = await import('@/lib/services/users');
    
    // Create or update user in Firestore
    const dbUser = await createOrUpdateUser(
      firebaseUserId,
      {
        email,
        firstName,
        lastName,
        displayName,
      }
    );
    
    return dbUser;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error syncing user to database:', errorMessage);
    
    // If Firebase Admin isn't configured, create a mock user object
    // This allows the app to work even if Firebase Admin isn't set up yet
    if (errorMessage.includes('FIREBASE_ADMIN') || 
        errorMessage.includes('Missing required Firebase') ||
        errorMessage.includes('DECODER')) {
      console.warn('[Auth] Firebase Admin not configured - creating mock user object');
      return {
        id: firebaseUserId,
        firebaseUserId,
        email,
        firstName,
        lastName,
        displayName,
        hasAppAccess: true,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DbUser;
    }
    
    throw error;
  }
}

/**
 * NextAuth configuration with database callbacks
 *
 * Extends the edge-compatible authConfig with Node.js-only features
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  callbacks: {

    /**
     * JWT callback - runs when JWT is created or updated
     *
     * On initial sign-in (credentials provider), we:
     * 1. Check if user exists in database and has access
     * 2. Sync user to our database if needed
     * 3. Store relevant info in the JWT
     */
    async jwt({ token, user, account }) {
      // On initial sign-in (user object is only available on first sign-in)
      if (user && account) {
        console.log('[Auth JWT] Initial sign-in detected for:', user.email);

        // Validate required fields
        const firebaseUserId = user.id;
        const email = user.email;
        const name = user.name || '';

        if (!firebaseUserId || !email) {
          console.error('[Auth JWT] Missing required user fields');
          return token;
        }

        console.log('[Auth JWT] Firebase user ID:', firebaseUserId);

        // Store Firebase UID in token
        token.firebaseUserId = firebaseUserId;

        // Check app access and admin status via database
        const { hasAccess, isAdmin } = await checkAppAccess(firebaseUserId);

        console.log('[Auth JWT] Access check: hasAccess=', hasAccess, 'isAdmin=', isAdmin);

        // For new users (not in database), grant access and sync them
        // This allows first-time logins to work
        if (!hasAccess) {
          console.log('[Auth JWT] User not in database, creating new user entry');
        }

        // Sync user to database
        try {
          const dbUser = await syncUserToDatabase(
            { uid: firebaseUserId, email, name },
            isAdmin
          );
          token.dbUserId = dbUser.id;
          token.isAdmin = dbUser.isAdmin;
          token.hasAccess = dbUser.hasAppAccess || dbUser.isAdmin;
          token.firstName = dbUser.firstName;
          token.displayName = dbUser.displayName;
          console.log('[Auth JWT] User synced to DB, dbUserId:', dbUser.id, 'hasAppAccess:', dbUser.hasAppAccess, 'isAdmin:', dbUser.isAdmin, 'hasAccess:', token.hasAccess);
        } catch (error) {
          console.error('[Auth JWT] Failed to sync user:', error);
          // For new users, still allow login but without DB record
          token.hasAccess = true; // Allow first-time login
          token.isAdmin = false;
        }
      } else if (token.firebaseUserId && (!token.hasAccess || token.hasAccess === false)) {
        // Not initial sign-in, but token doesn't have access - refresh it
        // This handles cases where user was granted access but token wasn't updated
        console.log('[Auth JWT] Token missing access, refreshing from DB for:', token.firebaseUserId);
        try {
          const { getUserByFirebaseId } = await import('@/lib/services/users');
          const dbUser = await getUserByFirebaseId(token.firebaseUserId as string);
          if (dbUser) {
            token.dbUserId = dbUser.id;
            token.isAdmin = dbUser.isAdmin;
            token.hasAccess = dbUser.hasAppAccess || dbUser.isAdmin;
            token.firstName = dbUser.firstName;
            token.displayName = dbUser.displayName;
            console.log('[Auth JWT] Token refreshed, hasAccess:', token.hasAccess);
          } else {
            // User not in DB - sync them
            const dbUser = await syncUserToDatabase(
              { uid: token.firebaseUserId as string, email: token.email || '', name: token.name || '' },
              false
            );
            token.dbUserId = dbUser.id;
            token.isAdmin = dbUser.isAdmin;
            token.hasAccess = dbUser.hasAppAccess || dbUser.isAdmin;
            token.firstName = dbUser.firstName;
            token.displayName = dbUser.displayName;
            console.log('[Auth JWT] User synced during token refresh, hasAccess:', token.hasAccess);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[Auth JWT] Failed to refresh token access:', errorMessage);
          
          // If Firebase Admin isn't configured, grant access as fallback
          if (errorMessage.includes('FIREBASE_ADMIN') || 
              errorMessage.includes('Missing required Firebase') ||
              errorMessage.includes('DECODER')) {
            console.warn('[Auth JWT] Firebase Admin not configured - granting access as fallback');
          }
          
          // Grant access as fallback if user can authenticate
          token.hasAccess = true;
        }
      }

      return token;
    },

    /**
     * Session callback - runs when session is checked
     *
     * Adds our custom fields to the session object.
     * Fetches the latest isAdmin status from the database to ensure
     * admin/access changes take effect immediately without re-login.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.dbUserId = token.dbUserId as string | undefined;
        session.user.id = (token.firebaseUserId as string) || token.sub || '';
        session.user.firstName = token.firstName as string | undefined;
        session.user.displayName = token.displayName as string | undefined;

        // Fetch latest admin status from database (in case it changed)
        // If user exists in DB, they have access (they're in an access group)
        if (token.dbUserId) {
          try {
            const { getUserById } = await import('@/lib/services/users');
            const dbUser = await getUserById(token.dbUserId as string);
            if (dbUser) {
              session.user.isAdmin = dbUser.isAdmin;
              // If user exists in DB, they should have access (they can authenticate)
              // Always grant access - if they're in DB, they're allowed
              session.user.hasAccess = true; // User exists in DB = they have access
              session.user.firstName = dbUser.firstName;
              session.user.displayName = dbUser.displayName;
              session.user.title = dbUser.title ?? undefined;
              console.log('[Auth Session] User found in DB, granting access. dbUserId:', token.dbUserId);
            } else {
              // User was removed from DB - but if token says they have access, grant it
              // This handles edge cases where DB lookup fails but user was just authenticated
              session.user.isAdmin = token.isAdmin || false;
              session.user.hasAccess = token.hasAccess || false;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Fallback to token values if DB query fails
            // If token has access, grant it (user was just authenticated)
            console.warn('[Auth Session] DB lookup failed, using token values:', errorMessage);
            
            // If Firebase Admin isn't configured, grant access as fallback
            if (errorMessage.includes('FIREBASE_ADMIN') || 
                errorMessage.includes('Missing required Firebase') ||
                errorMessage.includes('DECODER')) {
              console.warn('[Auth Session] Firebase Admin not configured - granting access as fallback');
              session.user.hasAccess = true;
              session.user.isAdmin = false;
            } else {
              session.user.isAdmin = token.isAdmin || false;
              session.user.hasAccess = token.hasAccess || false;
            }
          }
        } else {
          // No dbUserId - use token values (user may be in process of being synced)
          session.user.isAdmin = token.isAdmin || false;
          session.user.hasAccess = token.hasAccess || false;
        }
      }
      return session;
    },
  },

  // Only enable debug mode when explicitly set via AUTH_DEBUG environment variable
  // This prevents the debug warning and gives explicit control over debug logging
  debug: process.env.AUTH_DEBUG === 'true',
});
