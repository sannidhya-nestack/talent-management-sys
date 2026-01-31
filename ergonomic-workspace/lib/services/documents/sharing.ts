/**
 * Document Sharing Service
 *
 * Provides document sharing with links, expiration, and password protection.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { getDocumentById } from '../documents';
import crypto from 'crypto';

export interface SharedDocument {
  id: string;
  documentId: string;
  token: string;
  passwordHash: string | null;
  expiresAt: Date | null;
  accessCount: number;
  lastAccessedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

export interface CreateShareOptions {
  documentId: string;
  password?: string;
  expiresInDays?: number;
  createdBy: string;
}

export interface ShareAccessLog {
  id: string;
  shareId: string;
  accessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generate a secure token for sharing
 */
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash password for storage
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify password
 */
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Create a shareable link for a document
 *
 * @param options - Share options
 * @returns Shared document with token
 */
export async function createShare(options: CreateShareOptions): Promise<SharedDocument> {
  const { documentId, password, expiresInDays, createdBy } = options;

  // Verify document exists
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  const token = generateShareToken();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const shareData = {
    id: generateId(),
    documentId,
    token,
    passwordHash: password ? hashPassword(password) : null,
    expiresAt: expiresAt ? serverTimestamp() : null,
    accessCount: 0,
    lastAccessedAt: null,
    createdBy,
    createdAt: serverTimestamp(),
  };

  await collections.sharedDocuments().doc(shareData.id).set(shareData);

  return {
    ...shareData,
    expiresAt: expiresAt,
    lastAccessedAt: null,
    createdAt: new Date(),
  };
}

/**
 * Get share by token
 *
 * @param token - Share token
 * @returns Shared document or null
 */
export async function getShareByToken(token: string): Promise<SharedDocument | null> {
  const snapshot = await collections
    .sharedDocuments()
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  // Check expiration
  const expiresAt = timestampToDate(data.expiresAt);
  if (expiresAt && expiresAt < new Date()) {
    return null;
  }

  return {
    id: doc.id,
    documentId: data.documentId,
    token: data.token,
    passwordHash: data.passwordHash,
    expiresAt,
    accessCount: data.accessCount || 0,
    lastAccessedAt: timestampToDate(data.lastAccessedAt),
    createdBy: data.createdBy,
    createdAt: timestampToDate(data.createdAt) || new Date(),
  };
}

/**
 * Verify password for a share
 *
 * @param token - Share token
 * @param password - Password to verify
 * @returns True if password is correct
 */
export async function verifySharePassword(token: string, password: string): Promise<boolean> {
  const share = await getShareByToken(token);
  if (!share) {
    return false;
  }

  if (!share.passwordHash) {
    return true; // No password required
  }

  return verifyPassword(password, share.passwordHash);
}

/**
 * Record access to a shared document
 *
 * @param shareId - ID of the share
 * @param ipAddress - IP address of the accessor
 * @param userAgent - User agent of the accessor
 */
export async function recordShareAccess(
  shareId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const share = await collections.sharedDocuments().doc(shareId).get();
  if (!share.exists) {
    return;
  }

  // Update access count and last accessed
  await collections.sharedDocuments().doc(shareId).update({
    accessCount: (share.data()?.accessCount || 0) + 1,
    lastAccessedAt: serverTimestamp(),
  });

  // Log access
  const logId = generateId();
  await collections.sharedDocuments().doc(shareId).collection('accessLogs').doc(logId).set({
    id: logId,
    shareId,
    accessedAt: serverTimestamp(),
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });
}

/**
 * Get access logs for a share
 *
 * @param shareId - ID of the share
 * @returns Array of access logs
 */
export async function getShareAccessLogs(shareId: string): Promise<ShareAccessLog[]> {
  const snapshot = await collections
    .sharedDocuments()
    .doc(shareId)
    .collection('accessLogs')
    .orderBy('accessedAt', 'desc')
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      shareId: data.shareId,
      accessedAt: timestampToDate(data.accessedAt) || new Date(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };
  });
}

/**
 * Revoke a share
 *
 * @param shareId - ID of the share
 */
export async function revokeShare(shareId: string): Promise<void> {
  await collections.sharedDocuments().doc(shareId).delete();
}

/**
 * Get all shares for a document
 *
 * @param documentId - ID of the document
 * @returns Array of shares
 */
export async function getDocumentShares(documentId: string): Promise<SharedDocument[]> {
  const snapshot = await collections
    .sharedDocuments()
    .where('documentId', '==', documentId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      documentId: data.documentId,
      token: data.token,
      passwordHash: data.passwordHash,
      expiresAt: timestampToDate(data.expiresAt),
      accessCount: data.accessCount || 0,
      lastAccessedAt: timestampToDate(data.lastAccessedAt),
      createdBy: data.createdBy,
      createdAt: timestampToDate(data.createdAt) || new Date(),
    };
  });
}
