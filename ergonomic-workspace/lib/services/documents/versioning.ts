/**
 * Document Version Control Service
 *
 * Provides version tracking, comparison, and restore capabilities for documents.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { getDocumentById, updateDocument } from '../documents';

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  tags: string | null;
  ocrText: string | null;
  createdBy: string;
  createdAt: Date;
  changeReason?: string;
}

export interface VersionComparison {
  added: string[];
  removed: string[];
  modified: string[];
}

/**
 * Create a version snapshot before updating a document
 *
 * @param documentId - ID of the document
 * @param currentData - Current document data
 * @param changeReason - Reason for the change
 * @returns Created version
 */
export async function createVersion(
  documentId: string,
  currentData: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: string;
    tags: string | null;
    ocrText: string | null;
    version: number;
    uploadedBy: string;
  },
  changeReason?: string
): Promise<DocumentVersion> {
  const versionId = generateId();
  const versionData = {
    id: versionId,
    documentId,
    version: currentData.version,
    fileName: currentData.fileName,
    fileUrl: currentData.fileUrl,
    fileType: currentData.fileType,
    fileSize: currentData.fileSize,
    category: currentData.category,
    tags: currentData.tags,
    ocrText: currentData.ocrText,
    createdBy: currentData.uploadedBy,
    changeReason: changeReason || null,
    createdAt: serverTimestamp(),
  };

  await collections.documentVersions().doc(versionId).set(versionData);

  return {
    ...versionData,
    createdAt: new Date(),
  };
}

/**
 * Get all versions for a document
 *
 * @param documentId - ID of the document
 * @returns Array of versions sorted by version number (descending)
 */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  let snapshot;
  let docs: FirebaseFirestore.QueryDocumentSnapshot[];

  try {
    snapshot = await collections
      .documentVersions()
      .where('documentId', '==', documentId)
      .orderBy('version', 'desc')
      .get();
    docs = snapshot.docs;
  } catch (error) {
    snapshot = await collections
      .documentVersions()
      .where('documentId', '==', documentId)
      .get();
    docs = [...snapshot.docs].sort((a, b) => {
      const aVersion = a.data().version || 0;
      const bVersion = b.data().version || 0;
      return bVersion - aVersion;
    });
  }

  return docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      documentId: data.documentId,
      version: data.version,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: data.fileSize,
      category: data.category,
      tags: data.tags,
      ocrText: data.ocrText,
      createdBy: data.createdBy,
      changeReason: data.changeReason,
      createdAt: timestampToDate(data.createdAt) || new Date(),
    };
  });
}

/**
 * Get a specific version
 *
 * @param versionId - ID of the version
 * @returns Version data
 */
export async function getVersionById(versionId: string): Promise<DocumentVersion | null> {
  const doc = await collections.documentVersions().doc(versionId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    documentId: data.documentId,
    version: data.version,
    fileName: data.fileName,
    fileUrl: data.fileUrl,
    fileType: data.fileType,
    fileSize: data.fileSize,
    category: data.category,
    tags: data.tags,
    ocrText: data.ocrText,
    createdBy: data.createdBy,
    changeReason: data.changeReason,
    createdAt: timestampToDate(data.createdAt) || new Date(),
  };
}

/**
 * Compare two versions
 *
 * @param version1Id - ID of first version
 * @param version2Id - ID of second version
 * @returns Comparison result
 */
export async function compareVersions(
  version1Id: string,
  version2Id: string
): Promise<VersionComparison> {
  const [version1, version2] = await Promise.all([
    getVersionById(version1Id),
    getVersionById(version2Id),
  ]);

  if (!version1 || !version2) {
    throw new Error('One or both versions not found');
  }

  const comparison: VersionComparison = {
    added: [],
    removed: [],
    modified: [],
  };

  // Compare fields
  const fields: Array<keyof DocumentVersion> = [
    'fileName',
    'fileUrl',
    'fileType',
    'fileSize',
    'category',
    'tags',
    'ocrText',
  ];

  fields.forEach((field) => {
    const v1Value = version1[field];
    const v2Value = version2[field];

    if (v1Value === undefined && v2Value !== undefined) {
      comparison.added.push(field);
    } else if (v1Value !== undefined && v2Value === undefined) {
      comparison.removed.push(field);
    } else if (v1Value !== v2Value) {
      comparison.modified.push(field);
    }
  });

  return comparison;
}

/**
 * Restore a document to a previous version
 *
 * @param documentId - ID of the document
 * @param versionId - ID of the version to restore
 * @param restoredBy - User ID who is restoring
 * @returns Updated document
 */
export async function restoreVersion(
  documentId: string,
  versionId: string,
  restoredBy: string
): Promise<void> {
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  const version = await getVersionById(versionId);
  if (!version) {
    throw new Error('Version not found');
  }

  // Create a version of current state before restoring
  await createVersion(documentId, {
    fileName: document.fileName,
    fileUrl: document.fileUrl,
    fileType: document.fileType,
    fileSize: document.fileSize,
    category: document.category,
    tags: document.tags,
    ocrText: document.ocrText,
    version: document.version,
    uploadedBy: document.uploader.id,
  }, 'Before restore');

  // Restore from version
  await updateDocument(documentId, {
    fileName: version.fileName,
    category: version.category as any,
    tags: version.tags || undefined,
  });

  // Note: fileUrl, fileType, fileSize, and ocrText would need to be restored
  // through a separate update if the document service supports it
}
