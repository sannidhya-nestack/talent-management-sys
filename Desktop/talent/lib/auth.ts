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
import { db } from './db';
import type { User as DbUser } from '@/lib/generated/prisma/client';

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
 * Check if a user has access to the Talent app and their role
 *
 * Access Control via Database:
 * - Checks the local database for user record
 * - `hasAppAccess: true` - User can access the app (hiring manager)
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
    console.error('[Auth] Error checking app access via database:', error);
    // On error, deny access for security
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
    // Try to find existing user
    const existingUser = await db.user.findUnique({
      where: { firebaseUserId },
    });

    if (existingUser) {
      // Update existing user with all profile fields
      const updatedUser = await db.user.update({
        where: { firebaseUserId },
        data: {
          email,
          firstName,
          middleName: middleName ?? existingUser.middleName,
          lastName,
          displayName,
          title: title ?? existingUser.title,
          city: city ?? existingUser.city,
          state: state ?? existingUser.state,
          countryCode: countryCode ?? existingUser.countryCode,
          preferredLanguage,
          timezone,
          isAdmin,
          hasAppAccess: true, // User has access if we're syncing them
          lastSyncedAt: new Date(),
        },
      });
      return updatedUser;
    } else {
      // Create new user with all profile fields
      const newUser = await db.user.create({
        data: {
          firebaseUserId,
          email,
          firstName,
          middleName,
          lastName,
          displayName,
          title,
          city,
          state,
          countryCode,
          preferredLanguage,
          timezone,
          organisation: 'Nestack Technologies',
          isAdmin,
          hasAppAccess: true, // User has access if we're syncing them
          lastSyncedAt: new Date(),
        },
      });
      return newUser;
    }
  } catch (error) {
    console.error('Error syncing user to database:', error);
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
          console.log('[Auth JWT] User synced to DB, dbUserId:', dbUser.id, 'isAdmin:', dbUser.isAdmin);
        } catch (error) {
          console.error('[Auth JWT] Failed to sync user:', error);
          // For new users, still allow login but without DB record
          token.hasAccess = true; // Allow first-time login
          token.isAdmin = false;
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
            const dbUser = await db.user.findUnique({
              where: { id: token.dbUserId as string },
              select: { isAdmin: true, firstName: true, displayName: true, title: true },
            });
            if (dbUser) {
              session.user.isAdmin = dbUser.isAdmin;
              session.user.hasAccess = true;
              session.user.firstName = dbUser.firstName;
              session.user.displayName = dbUser.displayName;
              session.user.title = dbUser.title ?? undefined;
            } else {
              // User was removed from DB (no longer in access groups)
              session.user.isAdmin = false;
              session.user.hasAccess = false;
            }
          } catch {
            // Fallback to token values if DB query fails
            session.user.isAdmin = token.isAdmin || false;
            session.user.hasAccess = token.hasAccess || false;
          }
        } else {
          session.user.isAdmin = token.isAdmin || false;
          session.user.hasAccess = token.hasAccess || false;
        }
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === 'development',
});
