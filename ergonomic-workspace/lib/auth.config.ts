/**
 * Authentication Configuration (Edge-Compatible)
 *
 * This module contains the NextAuth configuration that can run in Edge Runtime.
 * It does NOT include any database operations or Node.js-specific modules.
 *
 * Used by:
 * - middleware.ts (for route protection)
 *
 * The full auth configuration with database sync is in auth.ts
 */

import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Debug: Log Firebase config on startup (remove in production)
if (process.env.NODE_ENV === 'development') {
  console.log('[Auth Config] Firebase configured:', !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('[Auth Config] NextAuth secret set:', !!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET));
}

// Check for NextAuth secret
if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET && process.env.NODE_ENV !== 'test') {
  console.error(
    '[Auth Config] ERROR: NEXTAUTH_SECRET or AUTH_SECRET is required!\n' +
    'Please set NEXTAUTH_SECRET in your .env file.\n' +
    'You can generate one with: openssl rand -base64 32'
  );
}

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  
  providers: [
    // Firebase Email/Password Authentication via Credentials provider
    Credentials({
      id: 'credentials',
      name: 'Firebase',
      credentials: {
        idToken: { label: 'ID Token', type: 'text' },
        email: { label: 'Email', type: 'email' },
        uid: { label: 'UID', type: 'text' },
      },
      async authorize(credentials) {
        // Validate required credentials
        if (!credentials?.email || !credentials?.uid || !credentials?.idToken) {
          console.error('[Auth] Missing credentials');
          return null;
        }

        const email = credentials.email as string;
        const uid = credentials.uid as string;
        const idToken = credentials.idToken as string;

        // Basic validation - Firebase has already authenticated the user client-side
        // The ID token was obtained from Firebase Auth after successful sign-in
        if (!idToken || idToken.length < 100) {
          console.error('[Auth] Invalid ID token');
          return null;
        }

        console.log('[Auth] Credentials authorize: email=', email, 'uid=', uid);

        // Return user object for NextAuth session
        // The sub field is used as the unique identifier
        return {
          id: uid,
          email: email,
          name: email.split('@')[0], // Use email prefix as name
        };
      },
    }),
  ],

  pages: {
    signIn: '/',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  callbacks: {
    /**
     * Authorized callback - runs in Edge Runtime for middleware
     *
     * This only checks if the user is authenticated.
     * Admin checks are done in the JWT callback in auth.ts
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Define protected route patterns for ergonomic workspace
      const isProtectedRoute =
        nextUrl.pathname.startsWith('/dashboard') ||
        nextUrl.pathname.startsWith('/clients') ||
        nextUrl.pathname.startsWith('/assessments') ||
        nextUrl.pathname.startsWith('/questionnaires') ||
        nextUrl.pathname.startsWith('/interior-planning') ||
        nextUrl.pathname.startsWith('/installations') ||
        nextUrl.pathname.startsWith('/integrations') ||
        nextUrl.pathname.startsWith('/settings');

      if (isProtectedRoute && !isLoggedIn) {
        return false; // Will redirect to signIn page
      }

      return true;
    },
  },
};
