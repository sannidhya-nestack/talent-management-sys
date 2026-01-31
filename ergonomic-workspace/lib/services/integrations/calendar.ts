/**
 * Calendar Integration Service
 *
 * Provides operations for managing calendar account integrations (Google Calendar, Outlook).
 * Handles OAuth credential storage and account management.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { getUserById } from '../users';

export type CalendarProvider = 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR';

export interface CalendarAccount {
  id: string;
  userId: string;
  provider: CalendarProvider;
  email: string;
  accessToken: string; // Encrypted
  refreshToken: string | null; // Encrypted
  expiresAt: Date | null;
  scopes: string;
  calendarId?: string; // Specific calendar ID if multiple calendars
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarAccountListItem {
  id: string;
  userId: string;
  provider: CalendarProvider;
  email: string;
  isActive: boolean;
  connectedAt: Date;
  userName: string;
}

export interface CreateCalendarAccountData {
  userId: string;
  provider: CalendarProvider;
  email: string;
  accessToken: string; // Should be encrypted before calling
  refreshToken: string | null; // Should be encrypted before calling
  expiresAt: Date | null;
  scopes: string;
  calendarId?: string;
}

/**
 * Create or update calendar account
 */
export async function upsertCalendarAccount(data: CreateCalendarAccountData): Promise<CalendarAccount> {
  // Check if account already exists
  const existing = await collections
    .calendarAccounts()
    .where('userId', '==', data.userId)
    .where('provider', '==', data.provider)
    .limit(1)
    .get();

  const accountData = {
    id: existing.empty ? generateId() : existing.docs[0].id,
    userId: data.userId,
    provider: data.provider,
    email: data.email,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt ? serverTimestamp() : null,
    scopes: data.scopes,
    calendarId: data.calendarId || null,
    isActive: true,
    createdAt: existing.empty ? serverTimestamp() : existing.docs[0].data().createdAt,
    updatedAt: serverTimestamp(),
  };

  await collections.calendarAccounts().doc(accountData.id).set(accountData, { merge: !existing.empty });

  return {
    ...accountData,
    expiresAt: data.expiresAt,
    createdAt: timestampToDate(accountData.createdAt) || new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get calendar account for a user
 */
export async function getCalendarAccount(
  userId: string,
  provider: CalendarProvider
): Promise<CalendarAccount | null> {
  const snapshot = await collections
    .calendarAccounts()
    .where('userId', '==', userId)
    .where('provider', '==', provider)
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    userId: data.userId,
    provider: data.provider,
    email: data.email,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: timestampToDate(data.expiresAt),
    scopes: data.scopes,
    calendarId: data.calendarId,
    isActive: data.isActive,
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
  };
}

/**
 * Get all calendar accounts for a user
 */
export async function getUserCalendarAccounts(userId: string): Promise<CalendarAccountListItem[]> {
  const snapshot = await collections
    .calendarAccounts()
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get();

  const accounts = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const user = await getUserById(data.userId);

      return {
        id: doc.id,
        userId: data.userId,
        provider: data.provider as CalendarProvider,
        email: data.email,
        isActive: data.isActive,
        connectedAt: timestampToDate(data.createdAt) || new Date(),
        userName: user?.displayName || 'Unknown',
      };
    })
  );

  return accounts;
}

/**
 * Update calendar account tokens
 */
export async function updateCalendarAccountTokens(
  accountId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): Promise<void> {
  await collections.calendarAccounts().doc(accountId).update({
    accessToken,
    refreshToken,
    expiresAt: expiresAt ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Disconnect calendar account
 */
export async function disconnectCalendarAccount(accountId: string): Promise<void> {
  await collections.calendarAccounts().doc(accountId).update({
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if user has calendar account connected
 */
export async function hasCalendarAccountConnected(
  userId: string,
  provider: CalendarProvider
): Promise<boolean> {
  const account = await getCalendarAccount(userId, provider);
  return account !== null;
}
