/**
 * User Service
 *
 * Provides CRUD operations for managing Nestack personnel.
 * Handles database operations and business logic for users.
 */

import { db } from '@/lib/db';
import { Prisma, UserStatus } from '@/lib/generated/prisma/client';
import type {
  User,
  UserListItem,
  CreateUserData,
  UpdateUserData,
  UpdateProfileData,
  UserStats,
} from '@/types/user';

/**
 * Get all users with optional filtering
 *
 * @param options - Filter options
 * @returns Array of users for list display
 */
export async function getUsers(options?: {
  isAdmin?: boolean;
  userStatus?: UserStatus | 'ALL' | 'DISABLED' | 'INACTIVE';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<UserListItem[]> {
  const { isAdmin, userStatus, search, limit = 100, offset = 0 } = options || {};

  const where: Prisma.UserWhereInput = {};

  if (isAdmin !== undefined) {
    where.isAdmin = isAdmin;
  }

  // Filter by user status
  // 'ALL' excludes DISABLED users (disabled employees)
  // 'DISABLED' shows only DISABLED users
  // 'INACTIVE' shows SUSPENDED users
  if (userStatus === 'DISABLED') {
    where.userStatus = 'DISABLED';
  } else if (userStatus === 'INACTIVE') {
    where.userStatus = 'SUSPENDED';
  } else if (userStatus && userStatus !== 'ALL') {
    where.userStatus = userStatus;
  } else {
    // Default 'ALL' excludes disabled users
    where.userStatus = { not: 'DISABLED' };
  }

  if (search) {
    where.OR = [
      { email: { contains: search } },
      { displayName: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      title: true,
      isAdmin: true,
      hasAppAccess: true,
      schedulingLink: true,
      userStatus: true,
      lastSyncedAt: true,
      createdAt: true,
    },
    orderBy: { displayName: 'asc' },
    take: limit,
    skip: offset,
  });

  return users;
}

/**
 * Get a single user by ID
 *
 * @param id - User ID (UUID)
 * @returns User or null if not found
 */
export async function getUserById(id: string): Promise<User | null> {
  const user = await db.user.findUnique({
    where: { id },
  });

  return user;
}

/**
 * Get a user by Firebase UID
 *
 * @param firebaseUserId - Firebase user UID
 * @returns User or null if not found
 */
export async function getUserByFirebaseId(firebaseUserId: string): Promise<User | null> {
  const user = await db.user.findUnique({
    where: { firebaseUserId },
  });

  return user;
}

/**
 * Get a user by email
 *
 * @param email - User email
 * @returns User or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await db.user.findUnique({
    where: { email },
  });

  return user;
}

/**
 * Create a new user
 *
 * @param data - User creation data
 * @returns Created user
 */
export async function createUser(data: CreateUserData): Promise<User> {
  const user = await db.user.create({
    data: {
      firebaseUserId: data.firebaseUserId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
      secondaryEmail: data.secondaryEmail,
      middleName: data.middleName,
      title: data.title,
      city: data.city,
      state: data.state,
      countryCode: data.countryCode,
      preferredLanguage: data.preferredLanguage || 'en',
      timezone: data.timezone || 'America/New_York',
      organisation: data.organisation || 'Nestack Technologies',
      operationalClearance: data.operationalClearance || 'A',
      isAdmin: data.isAdmin || false,
      schedulingLink: data.schedulingLink,
      lastSyncedAt: new Date(),
    },
  });

  return user;
}

/**
 * Update a user (admin operation)
 *
 * @param id - User ID
 * @param data - Update data
 * @returns Updated user
 */
export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const user = await db.user.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  return user;
}

/**
 * Update own profile (non-admin operation)
 *
 * @param id - User ID
 * @param data - Profile update data
 * @returns Updated user
 */
export async function updateProfile(id: string, data: UpdateProfileData): Promise<User> {
  const user = await db.user.update({
    where: { id },
    data: {
      schedulingLink: data.schedulingLink,
      updatedAt: new Date(),
    },
  });

  return user;
}

/**
 * Delete a user
 *
 * @param id - User ID
 */
export async function deleteUser(id: string): Promise<void> {
  await db.user.delete({
    where: { id },
  });
}

/**
 * Get user statistics
 *
 * @returns User statistics
 */
export async function getUserStats(): Promise<UserStats> {
  const [totalAll, active, disabled, admins, withSchedulingLink, lastSyncedUser] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { userStatus: 'ACTIVE' } }),
    db.user.count({ where: { userStatus: 'DISABLED' } }),
    db.user.count({ where: { isAdmin: true } }),
    db.user.count({ where: { schedulingLink: { not: null } } }),
    db.user.findFirst({
      where: { lastSyncedAt: { not: null } },
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    }),
  ]);

  // Total excludes disabled users for the "All" tab
  const total = totalAll - disabled;

  return {
    total,
    active,
    inactive: total - active,
    dismissed: disabled, // Map disabled to dismissed for compatibility
    admins,
    hiringManagers: total - admins,
    withSchedulingLink,
    lastSyncedAt: lastSyncedUser?.lastSyncedAt ?? null,
  };
}

/**
 * Get users who can conduct interviews (have scheduling link set and are active)
 *
 * @returns Array of users with scheduling links
 */
export async function getInterviewers(): Promise<UserListItem[]> {
  const users = await db.user.findMany({
    where: {
      schedulingLink: { not: null },
      userStatus: 'ACTIVE', // Only active users can interview
      hasAppAccess: true, // Only users with app access can interview
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      title: true,
      isAdmin: true,
      hasAppAccess: true,
      schedulingLink: true,
      userStatus: true,
      lastSyncedAt: true,
      createdAt: true,
    },
    orderBy: { displayName: 'asc' },
  });

  return users;
}

/**
 * Mark a user as synced from Firebase
 *
 * @param id - User ID
 * @returns Updated user
 */
export async function markUserSynced(id: string): Promise<User> {
  const user = await db.user.update({
    where: { id },
    data: {
      lastSyncedAt: new Date(),
    },
  });

  return user;
}

/**
 * Sync ALL users from Firebase to local database
 *
 * Syncs the complete Firebase Auth directory to the local database.
 * Updates role information based on custom claims:
 * - isAdmin: user has `isAdmin: true` custom claim
 * - hasAppAccess: user has `hasAppAccess: true` custom claim or is admin
 *
 * Users without app access will still be in the roster but won't have app access.
 * Users no longer in Firebase will be removed from the database.
 *
 * @param users - Array of all user data from Firebase with role info
 * @param currentUserDbId - The database ID of the current user (to prevent self-deletion)
 * @returns Object with synced and removed counts
 */
export async function syncUsersFromFirebase(
  users: Array<{
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
    userStatus?: UserStatus;
    isAdmin?: boolean;
    hasAppAccess?: boolean;
  }>,
  currentUserDbId?: string
): Promise<{ synced: number; removed: number }> {
  let synced = 0;
  let removed = 0;

  // Build full display name: First + Middle (if exists) + Last
  const buildDisplayName = (first: string, middle?: string, last?: string) => {
    const parts = [first];
    if (middle) parts.push(middle);
    if (last) parts.push(last);
    return parts.join(' ');
  };

  // Upsert all users from Firebase
  for (const userData of users) {
    const displayName = userData.displayName ||
      buildDisplayName(userData.firstName, userData.middleName, userData.lastName);

    await db.user.upsert({
      where: { firebaseUserId: userData.firebaseUserId },
      update: {
        email: userData.email,
        firstName: userData.firstName,
        middleName: userData.middleName,
        lastName: userData.lastName,
        displayName,
        title: userData.title,
        city: userData.city,
        state: userData.state,
        countryCode: userData.countryCode,
        preferredLanguage: userData.preferredLanguage || 'en',
        timezone: userData.timezone || 'America/New_York',
        userStatus: userData.userStatus || 'ACTIVE',
        isAdmin: userData.isAdmin ?? false,
        hasAppAccess: userData.hasAppAccess ?? false,
        lastSyncedAt: new Date(),
      },
      create: {
        firebaseUserId: userData.firebaseUserId,
        email: userData.email,
        firstName: userData.firstName,
        middleName: userData.middleName,
        lastName: userData.lastName,
        displayName,
        title: userData.title,
        city: userData.city,
        state: userData.state,
        countryCode: userData.countryCode,
        preferredLanguage: userData.preferredLanguage || 'en',
        timezone: userData.timezone || 'America/New_York',
        organisation: 'Nestack Technologies',
        userStatus: userData.userStatus || 'ACTIVE',
        isAdmin: userData.isAdmin || false,
        hasAppAccess: userData.hasAppAccess || false,
        lastSyncedAt: new Date(),
      },
    });
    synced++;
  }

  // Remove users who are no longer in Firebase at all
  // This includes seed/test data that doesn't correspond to real Firebase users
  const validFirebaseIds = new Set(users.map((u) => u.firebaseUserId));
  const allDbUsers = await db.user.findMany({
    select: { id: true, firebaseUserId: true, email: true },
  });

  for (const dbUser of allDbUsers) {
    if (!validFirebaseIds.has(dbUser.firebaseUserId)) {
      // Don't delete the current user (safety check)
      if (currentUserDbId && dbUser.id === currentUserDbId) {
        console.log(`[Sync] Skipping deletion of current user: ${dbUser.email}`);
        continue;
      }
      
      console.log(`[Sync] Removing user no longer in Firebase: ${dbUser.email}`);
      
      // Use transaction to ensure atomicity - all related records are deleted together
      await db.$transaction(async (tx) => {
        // Delete related records first to avoid foreign key constraint violations
        // Interview and Decision don't have onDelete: Cascade, so we need to handle them manually
        await tx.interview.deleteMany({
          where: { interviewerId: dbUser.id },
        });
        
        await tx.decision.deleteMany({
          where: { decidedBy: dbUser.id },
        });
        
        // AuditLog and EmailLog have onDelete: SetNull, so they'll be handled automatically
        // But let's be explicit for audit trail purposes
        await tx.auditLog.updateMany({
          where: { userId: dbUser.id },
          data: { userId: null },
        });
        
        await tx.emailLog.updateMany({
          where: { sentBy: dbUser.id },
          data: { sentBy: null },
        });
        
        // Now we can safely delete the user
        await tx.user.delete({
          where: { id: dbUser.id },
        });
      });
      removed++;
    }
  }

  return { synced, removed };
}
