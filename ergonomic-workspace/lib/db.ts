/**
 * Firestore Database Client
 *
 * This module provides Firestore client instance for database operations.
 * Uses Firebase Admin SDK for server-side Firestore access.
 *
 * Usage:
 * ```typescript
 * import { db, collections } from '@/lib/db';
 *
 * const clients = await collections.clients().get();
 * const client = await collections.clients().doc(id).get();
 * ```
 */

import { getFirestoreInstance } from '@/lib/firebase/admin';
import type { Firestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

/**
 * Get Firestore instance (singleton)
 * Lazy initialization - only initializes when first accessed
 */
let _db: Firestore | null = null;

export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestoreInstance();
  }
  return _db;
}

// Export db as a function for lazy initialization
// Use getDb() directly or db() for convenience
export const db = getDb;

/**
 * Collection helpers for type-safe collection access
 */
export const collections = {
  users: () => getDb().collection(COLLECTIONS.USERS),
  clients: () => getDb().collection(COLLECTIONS.CLIENTS),
  contacts: () => getDb().collection(COLLECTIONS.CONTACTS),
  projects: () => getDb().collection(COLLECTIONS.PROJECTS),
  assessments: () => getDb().collection(COLLECTIONS.ASSESSMENTS),
  questionnaires: () => getDb().collection(COLLECTIONS.QUESTIONNAIRES),
  questionnaireTemplates: () => getDb().collection(COLLECTIONS.QUESTIONNAIRE_TEMPLATES),
  questionnaireResponses: () => getDb().collection(COLLECTIONS.QUESTIONNAIRE_RESPONSES),
  documents: () => getDb().collection(COLLECTIONS.DOCUMENTS),
  activities: () => getDb().collection(COLLECTIONS.ACTIVITIES),
  communications: () => getDb().collection(COLLECTIONS.COMMUNICATIONS),
  invoices: () => getDb().collection(COLLECTIONS.INVOICES),
  payments: () => getDb().collection(COLLECTIONS.PAYMENTS),
  installations: () => getDb().collection(COLLECTIONS.INSTALLATIONS),
  products: () => getDb().collection(COLLECTIONS.PRODUCTS),
  layouts: () => getDb().collection(COLLECTIONS.LAYOUTS),
  emailAccounts: () => getDb().collection(COLLECTIONS.EMAIL_ACCOUNTS),
  calendarAccounts: () => getDb().collection(COLLECTIONS.CALENDAR_ACCOUNTS),
  accountingAccounts: () => getDb().collection(COLLECTIONS.ACCOUNTING_ACCOUNTS),
  aiConversations: () => getDb().collection(COLLECTIONS.AI_CONVERSATIONS),
  auditLogs: () => getDb().collection(COLLECTIONS.AUDIT_LOGS),
};

/**
 * Helper function to generate a new document ID
 */
export function generateId(): string {
  return getDb().collection('_temp').doc().id;
}

/**
 * Helper function to batch write operations
 */
export function batch(): FirebaseFirestore.WriteBatch {
  return getDb().batch();
}

/**
 * Helper function to run transactions
 */
export function runTransaction<T>(
  updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> {
  return getDb().runTransaction(updateFunction);
}
