/**
 * Email Integration Service
 *
 * Provides operations for managing email account integrations (Gmail, Outlook).
 * Handles OAuth credential storage and account management.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { getUserById } from '../users';

export type EmailProvider = 'GMAIL' | 'OUTLOOK';

export interface EmailAccount {
  id: string;
  userId: string;
  provider: EmailProvider;
  email: string;
  accessToken: string; // Encrypted
  refreshToken: string | null; // Encrypted
  expiresAt: Date | null;
  scopes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailAccountListItem {
  id: string;
  userId: string;
  provider: EmailProvider;
  email: string;
  isActive: boolean;
  connectedAt: Date;
  userName: string;
}

export interface CreateEmailAccountData {
  userId: string;
  provider: EmailProvider;
  email: string;
  accessToken: string; // Should be encrypted before calling
  refreshToken: string | null; // Should be encrypted before calling
  expiresAt: Date | null;
  scopes: string;
}

/**
 * Create or update email account
 */
export async function upsertEmailAccount(data: CreateEmailAccountData): Promise<EmailAccount> {
  // Check if account already exists
  const existing = await collections
    .emailAccounts()
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
    isActive: true,
    createdAt: existing.empty ? serverTimestamp() : existing.docs[0].data().createdAt,
    updatedAt: serverTimestamp(),
  };

  await collections.emailAccounts().doc(accountData.id).set(accountData, { merge: !existing.empty });

  return {
    ...accountData,
    expiresAt: data.expiresAt,
    createdAt: timestampToDate(accountData.createdAt) || new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get email account for a user
 */
export async function getEmailAccount(
  userId: string,
  provider: EmailProvider
): Promise<EmailAccount | null> {
  const snapshot = await collections
    .emailAccounts()
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
    isActive: data.isActive,
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
  };
}

/**
 * Get all email accounts for a user
 */
export async function getUserEmailAccounts(userId: string): Promise<EmailAccountListItem[]> {
  const snapshot = await collections
    .emailAccounts()
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
        provider: data.provider as EmailProvider,
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
 * Update email account tokens
 */
export async function updateEmailAccountTokens(
  accountId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): Promise<void> {
  await collections.emailAccounts().doc(accountId).update({
    accessToken,
    refreshToken,
    expiresAt: expiresAt ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Disconnect email account
 */
export async function disconnectEmailAccount(accountId: string): Promise<void> {
  await collections.emailAccounts().doc(accountId).update({
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if user has email account connected
 */
export async function hasEmailAccountConnected(
  userId: string,
  provider: EmailProvider
): Promise<boolean> {
  const account = await getEmailAccount(userId, provider);
  return account !== null;
}
