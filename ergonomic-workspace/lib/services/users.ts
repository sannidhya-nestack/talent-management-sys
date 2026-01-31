/**
 * User Service
 *
 * Provides CRUD operations for managing platform users.
 * Handles database operations and business logic for users.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import type { UserStatus } from '@/lib/types/firestore';

export interface User {
  id: string;
  firebaseUserId: string;
  email: string;
  secondaryEmail?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  displayName: string;
  title?: string | null;
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
  preferredLanguage: string;
  timezone: string;
  organisation: string;
  isAdmin: boolean;
  hasAppAccess: boolean;
  userStatus: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date | null;
}

/**
 * Get a single user by Firebase UID
 *
 * @param firebaseUserId - Firebase user UID
 * @returns User or null if not found
 */
export async function getUserByFirebaseId(firebaseUserId: string): Promise<User | null> {
  const snapshot = await collections.users()
    .where('firebaseUserId', '==', firebaseUserId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...toPlainObject(data),
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    lastSyncedAt: timestampToDate(data.lastSyncedAt),
  } as User;
}

/**
 * Get a single user by ID
 *
 * @param id - User ID (UUID)
 * @returns User or null if not found
 */
export async function getUserById(id: string): Promise<User | null> {
  const doc = await collections.users().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    ...toPlainObject(data),
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    lastSyncedAt: timestampToDate(data.lastSyncedAt),
  } as User;
}

/**
 * Get a single user by email
 *
 * @param email - User email
 * @returns User or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const snapshot = await collections.users()
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...toPlainObject(data),
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    lastSyncedAt: timestampToDate(data.lastSyncedAt),
  } as User;
}

/**
 * Create or update a user from Firebase Auth data
 *
 * @param firebaseUserId - Firebase user UID
 * @param data - User data
 * @returns Created or updated user
 */
export async function createOrUpdateUser(
  firebaseUserId: string,
  data: {
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    photoURL?: string;
  }
): Promise<User> {
  const existingUser = await getUserByFirebaseId(firebaseUserId);

  const userData = {
    firebaseUserId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: data.displayName || `${data.firstName} ${data.lastName}`,
    preferredLanguage: existingUser?.preferredLanguage || 'en',
    timezone: existingUser?.timezone || 'America/New_York',
    organisation: existingUser?.organisation || 'Ergonomic Workspace Solutions',
    isAdmin: existingUser?.isAdmin || false,
    hasAppAccess: existingUser?.hasAppAccess || false,
    userStatus: existingUser?.userStatus || 'ACTIVE',
    updatedAt: serverTimestamp(),
    lastSyncedAt: serverTimestamp(),
    ...(existingUser
      ? {}
      : {
          createdAt: serverTimestamp(),
        }),
  };

  if (existingUser) {
    await collections.users().doc(existingUser.id).update(userData);
    return getUserById(existingUser.id) as Promise<User>;
  } else {
    const newId = generateId();
    await collections.users().doc(newId).set({
      ...userData,
      id: newId,
      createdAt: serverTimestamp(),
    });
    return getUserById(newId) as Promise<User>;
  }
}
