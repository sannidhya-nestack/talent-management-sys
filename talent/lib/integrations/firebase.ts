/**
 * Firebase Integration Client
 *
 * Provides methods for interacting with Firebase Admin SDK for user management.
 * Used for syncing users from Firebase Auth to the local database.
 *
 * Access Control:
 * - Custom claims `isAdmin` and `hasAppAccess` control user permissions
 * - Users with `hasAppAccess: true` can access the app
 * - Users with `isAdmin: true` have full administrative access
 *
 * Required environment variables:
 * - FIREBASE_ADMIN_PRIVATE_KEY: Service account private key
 * - FIREBASE_ADMIN_CLIENT_EMAIL: Service account client email
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID: Firebase project ID
 */

import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from '@/lib/firebase/admin';
import type { FirebaseUserProfile } from '@/types/user';

/**
 * Error thrown when Firebase API calls fail
 */
export class FirebaseApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'FirebaseApiError';
  }
}

/**
 * Get a single user from Firebase by UID
 *
 * @param uid - Firebase user UID
 * @returns Firebase user record
 */
export async function getFirebaseUser(uid: string): Promise<FirebaseUserProfile> {
  try {
    const auth = getFirebaseAdminAuth();
    const userRecord = await auth.getUser(uid);

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName || undefined,
      photoURL: userRecord.photoURL || undefined,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime || undefined,
        lastRefreshTime: userRecord.metadata.lastRefreshTime || undefined,
      },
      customClaims: (userRecord.customClaims as { isAdmin?: boolean; hasAppAccess?: boolean }) || undefined,
      providerData: userRecord.providerData.map((provider) => ({
        uid: provider.uid,
        email: provider.email || null,
        displayName: provider.displayName || null,
        photoURL: provider.photoURL || null,
        providerId: provider.providerId,
      })),
    };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new FirebaseApiError('User not found', 404, 'USER_NOT_FOUND');
    }
    throw new FirebaseApiError(
      error.message || 'Failed to get Firebase user',
      500,
      error.code
    );
  }
}

/**
 * Get a user from Firebase by email
 *
 * @param email - User email address
 * @returns Firebase user record or null if not found
 */
export async function getFirebaseUserByEmail(email: string): Promise<FirebaseUserProfile | null> {
  try {
    const auth = getFirebaseAdminAuth();
    const userRecord = await auth.getUserByEmail(email);
    return getFirebaseUser(userRecord.uid);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw new FirebaseApiError(
      error.message || 'Failed to get Firebase user by email',
      500,
      error.code
    );
  }
}

/**
 * Set custom claims for a user
 *
 * @param uid - Firebase user UID
 * @param claims - Custom claims to set
 */
export async function setCustomClaims(
  uid: string,
  claims: { isAdmin?: boolean; hasAppAccess?: boolean }
): Promise<void> {
  try {
    const auth = getFirebaseAdminAuth();
    await auth.setCustomUserClaims(uid, claims);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new FirebaseApiError('User not found', 404, 'USER_NOT_FOUND');
    }
    throw new FirebaseApiError(
      error.message || 'Failed to set custom claims',
      500,
      error.code
    );
  }
}

/**
 * Get all users from Firebase Auth
 *
 * Note: Firebase Admin SDK listUsers() handles pagination automatically
 * but may be slow for large user bases. Consider implementing pagination
 * if you have thousands of users.
 *
 * @param maxResults - Maximum number of users to return (default: 1000)
 * @returns Array of Firebase user records
 */
export async function getAllFirebaseUsers(maxResults: number = 1000): Promise<FirebaseUserProfile[]> {
  try {
    const auth = getFirebaseAdminAuth();
    const listUsersResult = await auth.listUsers(maxResults);

    return listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName || undefined,
      photoURL: userRecord.photoURL || undefined,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime || undefined,
        lastRefreshTime: userRecord.metadata.lastRefreshTime || undefined,
      },
      customClaims: (userRecord.customClaims as { isAdmin?: boolean; hasAppAccess?: boolean }) || undefined,
      providerData: userRecord.providerData.map((provider) => ({
        uid: provider.uid,
        email: provider.email || null,
        displayName: provider.displayName || null,
        photoURL: provider.photoURL || null,
        providerId: provider.providerId,
      })),
    }));
  } catch (error: any) {
    throw new FirebaseApiError(
      error.message || 'Failed to list Firebase users',
      500,
      error.code
    );
  }
}

/**
 * Get all users from Firebase with their role/access information
 *
 * Uses database for user data (Admin SDK not required)
 * Returns users from local database instead of Firebase Auth
 *
 * @returns Array of all users with role information from database
 */
export async function getAllFirebaseUsersWithAdminStatus(): Promise<
  Array<{
    firebaseUserId: string;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    displayName?: string;
    title?: string;
    city?: string;
    state?: string;
    countryCode?: string;
    preferredLanguage?: string;
    timezone?: string;
    isAdmin: boolean;
    hasAppAccess: boolean;
    userStatus: 'ACTIVE' | 'DISABLED' | 'SUSPENDED';
  }>
> {
  // Use database instead of Firebase Admin SDK
  const { db } = await import('@/lib/db');
  const dbUsers = await db.user.findMany({
    select: {
      firebaseUserId: true,
      email: true,
      firstName: true,
      middleName: true,
      lastName: true,
      displayName: true,
      title: true,
      city: true,
      state: true,
      countryCode: true,
      preferredLanguage: true,
      timezone: true,
      isAdmin: true,
      hasAppAccess: true,
      userStatus: true,
    },
  });
  
  // Map database users to the expected format
  return dbUsers.map((user) => ({
    firebaseUserId: user.firebaseUserId,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName || undefined,
    lastName: user.lastName,
    displayName: user.displayName,
    title: user.title || undefined,
    city: user.city || undefined,
    state: user.state || undefined,
    countryCode: user.countryCode || undefined,
    preferredLanguage: user.preferredLanguage || undefined,
    timezone: user.timezone || undefined,
    isAdmin: user.isAdmin,
    hasAppAccess: user.hasAppAccess,
    userStatus: user.userStatus,
  }));
}

/**
 * Alias for getAllFirebaseUsersWithAdminStatus
 */
export const getTalentAppUsers = getAllFirebaseUsersWithAdminStatus;

/**
 * Check if a user is an admin
 *
 * @param firebaseUserId - Firebase user UID
 * @returns true if user has admin custom claim
 */
export async function isUserAdmin(firebaseUserId: string): Promise<boolean> {
  try {
    const user = await getFirebaseUser(firebaseUserId);
    return user.customClaims?.isAdmin === true;
  } catch (error) {
    if (error instanceof FirebaseApiError && error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Check if a user has access to the Talent app
 *
 * Uses database for access control (Admin SDK not required)
 *
 * @param firebaseUserId - Firebase user UID
 * @returns Object with hasAccess and isAdmin flags
 */
export async function checkUserAppAccess(firebaseUserId: string): Promise<{
  hasAccess: boolean;
  isAdmin: boolean;
}> {
  // Use database for access control (no Admin SDK needed)
  const { getUserByFirebaseId } = await import('@/lib/services/users');
  const dbUser = await getUserByFirebaseId(firebaseUserId);
  
  if (!dbUser) {
    return { hasAccess: false, isAdmin: false };
  }
  
  return {
    hasAccess: dbUser.hasAppAccess || dbUser.isAdmin,
    isAdmin: dbUser.isAdmin,
  };
}

/**
 * Grant admin access to a user
 * Updates database (Admin SDK not required)
 *
 * @param firebaseUserId - Firebase user UID
 */
export async function grantAdminAccess(firebaseUserId: string): Promise<void> {
  // Update database instead of Firebase custom claims
  const { getUserByFirebaseId, updateUser } = await import('@/lib/services/users');
  const dbUser = await getUserByFirebaseId(firebaseUserId);
  
  if (!dbUser) {
    throw new FirebaseApiError('User not found in database', 404);
  }
  
  await updateUser(dbUser.id, { isAdmin: true, hasAppAccess: true });
}

/**
 * Revoke admin access from a user
 * Updates database (Admin SDK not required)
 *
 * @param firebaseUserId - Firebase user UID
 */
export async function revokeAdminAccess(firebaseUserId: string): Promise<void> {
  // Update database instead of Firebase custom claims
  const { getUserByFirebaseId, updateUser } = await import('@/lib/services/users');
  const dbUser = await getUserByFirebaseId(firebaseUserId);
  
  if (!dbUser) {
    throw new FirebaseApiError('User not found in database', 404);
  }
  
  // Keep hasAppAccess true (they become a hiring manager)
  await updateUser(dbUser.id, { isAdmin: false, hasAppAccess: true });
}

/**
 * Grant app access to a user (hiring manager role)
 * Updates database (Admin SDK not required)
 *
 * @param firebaseUserId - Firebase user UID
 */
export async function grantTalentAppAccess(firebaseUserId: string): Promise<void> {
  // Update database instead of Firebase custom claims
  const { getUserByFirebaseId, updateUser } = await import('@/lib/services/users');
  const dbUser = await getUserByFirebaseId(firebaseUserId);
  
  if (!dbUser) {
    throw new FirebaseApiError('User not found in database', 404);
  }
  
  await updateUser(dbUser.id, { hasAppAccess: true });
}

/**
 * Revoke app access from a user
 * Updates database (Admin SDK not required)
 *
 * @param firebaseUserId - Firebase user UID
 */
export async function revokeTalentAppAccess(firebaseUserId: string): Promise<void> {
  // Update database instead of Firebase custom claims
  const { getUserByFirebaseId, updateUser } = await import('@/lib/services/users');
  const dbUser = await getUserByFirebaseId(firebaseUserId);
  
  if (!dbUser) {
    throw new FirebaseApiError('User not found in database', 404);
  }
  
  await updateUser(dbUser.id, { isAdmin: false, hasAppAccess: false });
}

/**
 * Revoke all app access - removes both admin and app access
 * Updates database (Admin SDK not required)
 *
 * @param firebaseUserId - Firebase user UID
 * @returns Object with info about which access was removed
 */
export async function revokeAllAppAccess(firebaseUserId: string): Promise<{
  removedAdmin: boolean;
  removedTalentAccess: boolean;
}> {
  // Update database instead of Firebase custom claims
  const { getUserByFirebaseId, updateUser } = await import('@/lib/services/users');
  const dbUser = await getUserByFirebaseId(firebaseUserId);
  
  if (!dbUser) {
    throw new FirebaseApiError('User not found in database', 404);
  }
  
  const hadAdmin = dbUser.isAdmin;
  const hadAccess = dbUser.hasAppAccess;
  
  await updateUser(dbUser.id, { isAdmin: false, hasAppAccess: false });

  return {
    removedAdmin: hadAdmin,
    removedTalentAccess: hadAccess,
  };
}

/**
 * Create a user in Firebase (for hired candidates)
 *
 * @param userData - User data for creation
 * @returns Created Firebase user record
 */
export async function createFirebaseUser(userData: {
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  password?: string;
}): Promise<FirebaseUserProfile> {
  try {
    const auth = getFirebaseAdminAuth();
    const displayName = userData.displayName || `${userData.firstName} ${userData.lastName}`.trim();

    const userRecord = await auth.createUser({
      email: userData.email,
      displayName,
      emailVerified: false,
      disabled: false,
      password: userData.password, // If not provided, user will need to reset password
    });

    return getFirebaseUser(userRecord.uid);
  } catch (error: any) {
    throw new FirebaseApiError(
      error.message || 'Failed to create Firebase user',
      500,
      error.code
    );
  }
}

/**
 * Update a user in Firebase
 *
 * @param firebaseUserId - Firebase user UID
 * @param updates - Fields to update
 */
export async function updateFirebaseUser(
  firebaseUserId: string,
  updates: {
    email?: string;
    displayName?: string;
    disabled?: boolean;
    emailVerified?: boolean;
  }
): Promise<FirebaseUserProfile> {
  try {
    const auth = getFirebaseAdminAuth();
    await auth.updateUser(firebaseUserId, updates);
    return getFirebaseUser(firebaseUserId);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new FirebaseApiError('User not found', 404, 'USER_NOT_FOUND');
    }
    throw new FirebaseApiError(
      error.message || 'Failed to update Firebase user',
      500,
      error.code
    );
  }
}

/**
 * Check if Firebase integration is configured
 *
 * @returns true if Firebase client credentials are set (Admin SDK not required)
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  );
}

/**
 * Test Firebase Admin SDK connectivity
 *
 * @returns true if connection is successful
 */
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    // Try to list users (requires valid Admin SDK credentials)
    await getAllFirebaseUsers(1);
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}
