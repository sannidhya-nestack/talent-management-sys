/**
 * Document Service
 *
 * Provides operations for managing client documents.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { DocumentCategory } from '@/lib/types/firestore';
import { getClientById } from './clients';
import { getUserById } from './users';

export interface DocumentListItem {
  id: string;
  clientId: string;
  projectId: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  ocrText: string | null;
  ocrProcessed: boolean;
  tags: string | null;
  version: number;
  uploadedAt: Date;
  uploader: {
    id: string;
    displayName: string;
  };
}

export interface CreateDocumentData {
  clientId: string;
  projectId?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  tags?: string;
  uploadedBy: string;
}

/**
 * Get documents with pagination
 *
 * @param options - Query options
 * @returns Documents and total count
 */
export async function getDocuments(options?: {
  page?: number;
  limit?: number;
  clientId?: string;
  projectId?: string;
  category?: DocumentCategory;
  search?: string;
}): Promise<{ documents: DocumentListItem[]; total: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;

  let query = collections.documents() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options?.clientId) {
    query = query.where('clientId', '==', options.clientId);
  }

  if (options?.projectId) {
    query = query.where('projectId', '==', options.projectId);
  }

  if (options?.category) {
    query = query.where('category', '==', options.category);
  }

  query = query.orderBy('uploadedAt', 'desc');

  const snapshot = await query.get();
  let documents = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...toPlainObject(data),
      uploadedAt: timestampToDate(data.uploadedAt) || new Date(),
    };
  });

  // Apply search filter client-side (Firestore doesn't support full-text search natively)
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    documents = documents.filter(
      (doc) =>
        doc.fileName?.toLowerCase().includes(searchLower) ||
        doc.ocrText?.toLowerCase().includes(searchLower) ||
        doc.tags?.toLowerCase().includes(searchLower)
    );
  }

  const total = documents.length;

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const paginatedDocs = documents.slice(startIndex, startIndex + limit);

  // Get uploader info for each document
  const documentsWithUploader = await Promise.all(
    paginatedDocs.map(async (doc) => {
      const uploader = await getUserById(doc.uploadedBy);
      return {
        ...doc,
        uploader: {
          id: doc.uploadedBy,
          displayName: uploader?.displayName || 'Unknown',
        },
      } as DocumentListItem;
    })
  );

  return { documents: documentsWithUploader, total };
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(id: string) {
  const doc = await collections.documents().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;

  // Get related data
  const [client, project, uploader] = await Promise.all([
    getClientById(data.clientId),
    data.projectId ? collections.projects().doc(data.projectId).get() : null,
    getUserById(data.uploadedBy),
  ]);

  return {
    id: doc.id,
    ...toPlainObject(data),
    uploadedAt: timestampToDate(data.uploadedAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    client: client
      ? {
          id: client.id,
          companyName: client.companyName,
        }
      : null,
    project: project?.exists
      ? {
          id: project.id,
          name: project.data()?.name || 'Unknown',
        }
      : null,
    uploader: uploader
      ? {
          id: uploader.id,
          displayName: uploader.displayName,
          email: uploader.email,
        }
      : null,
  };
}

/**
 * Create a new document
 */
export async function createDocument(data: CreateDocumentData) {
  const id = generateId();
  const documentData = {
    id,
    clientId: data.clientId,
    projectId: data.projectId || null,
    fileName: data.fileName,
    fileUrl: data.fileUrl,
    fileType: data.fileType,
    fileSize: data.fileSize,
    category: data.category,
    ocrText: null,
    ocrProcessed: false,
    tags: data.tags || null,
    version: 1,
    uploadedBy: data.uploadedBy,
    uploadedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.documents().doc(id).set(documentData);

  // Get related data for return
  const [client, uploader] = await Promise.all([
    getClientById(data.clientId),
    getUserById(data.uploadedBy),
  ]);

  return {
    id,
    ...documentData,
    uploadedAt: new Date(),
    updatedAt: new Date(),
    client: client
      ? {
          id: client.id,
          companyName: client.companyName,
        }
      : null,
    uploader: uploader
      ? {
          id: uploader.id,
          displayName: uploader.displayName,
        }
      : null,
  };
}

/**
 * Update document OCR text
 */
export async function updateDocumentOCR(id: string, ocrText: string): Promise<void> {
  await collections.documents().doc(id).update({
    ocrText,
    ocrProcessed: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update document metadata
 */
export async function updateDocument(
  id: string,
  data: {
    category?: DocumentCategory;
    tags?: string;
    fileName?: string;
  }
) {
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.category) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.fileName) updateData.fileName = data.fileName;

  await collections.documents().doc(id).update(updateData);

  return getDocumentById(id);
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  await collections.documents().doc(id).delete();
}
