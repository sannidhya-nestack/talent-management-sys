/**
 * Accounting Integration Service
 *
 * Provides operations for managing accounting account integrations (QuickBooks, Xero).
 * Handles OAuth credential storage and account management.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { getUserById } from '../users';

export type AccountingProvider = 'QUICKBOOKS' | 'XERO';

export interface AccountingAccount {
  id: string;
  userId: string;
  provider: AccountingProvider;
  companyId: string; // QuickBooks company ID or Xero tenant ID
  companyName: string;
  accessToken: string; // Encrypted
  refreshToken: string | null; // Encrypted
  expiresAt: Date | null;
  scopes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountingAccountListItem {
  id: string;
  userId: string;
  provider: AccountingProvider;
  companyName: string;
  isActive: boolean;
  connectedAt: Date;
  userName: string;
}

export interface CreateAccountingAccountData {
  userId: string;
  provider: AccountingProvider;
  companyId: string;
  companyName: string;
  accessToken: string; // Should be encrypted before calling
  refreshToken: string | null; // Should be encrypted before calling
  expiresAt: Date | null;
  scopes: string;
}

/**
 * Create or update accounting account
 */
export async function upsertAccountingAccount(data: CreateAccountingAccountData): Promise<AccountingAccount> {
  // Check if account already exists
  const existing = await collections
    .accountingAccounts()
    .where('userId', '==', data.userId)
    .where('provider', '==', data.provider)
    .where('companyId', '==', data.companyId)
    .limit(1)
    .get();

  const accountData = {
    id: existing.empty ? generateId() : existing.docs[0].id,
    userId: data.userId,
    provider: data.provider,
    companyId: data.companyId,
    companyName: data.companyName,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt ? serverTimestamp() : null,
    scopes: data.scopes,
    isActive: true,
    createdAt: existing.empty ? serverTimestamp() : existing.docs[0].data().createdAt,
    updatedAt: serverTimestamp(),
  };

  await collections.accountingAccounts().doc(accountData.id).set(accountData, { merge: !existing.empty });

  return {
    ...accountData,
    expiresAt: data.expiresAt,
    createdAt: timestampToDate(accountData.createdAt) || new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get accounting account for a user
 */
export async function getAccountingAccount(
  userId: string,
  provider: AccountingProvider
): Promise<AccountingAccount | null> {
  const snapshot = await collections
    .accountingAccounts()
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
    companyId: data.companyId,
    companyName: data.companyName,
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
 * Get all accounting accounts for a user
 */
export async function getUserAccountingAccounts(userId: string): Promise<AccountingAccountListItem[]> {
  const snapshot = await collections
    .accountingAccounts()
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
        provider: data.provider as AccountingProvider,
        companyName: data.companyName,
        isActive: data.isActive,
        connectedAt: timestampToDate(data.createdAt) || new Date(),
        userName: user?.displayName || 'Unknown',
      };
    })
  );

  return accounts;
}

/**
 * Update accounting account tokens
 */
export async function updateAccountingAccountTokens(
  accountId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): Promise<void> {
  await collections.accountingAccounts().doc(accountId).update({
    accessToken,
    refreshToken,
    expiresAt: expiresAt ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Disconnect accounting account
 */
export async function disconnectAccountingAccount(accountId: string): Promise<void> {
  await collections.accountingAccounts().doc(accountId).update({
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if user has accounting account connected
 */
export async function hasAccountingAccountConnected(
  userId: string,
  provider: AccountingProvider
): Promise<boolean> {
  const account = await getAccountingAccount(userId, provider);
  return account !== null;
}
