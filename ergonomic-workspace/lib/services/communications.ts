/**
 * Communication Service
 *
 * Provides operations for logging and managing communications.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { CommunicationType } from '@/lib/types/firestore';
import { getUserById } from './users';

export interface CommunicationListItem {
  id: string;
  type: CommunicationType;
  subject: string | null;
  date: Date;
  duration: number | null;
  userId: string;
  user: {
    displayName: string;
  };
}

export interface CreateCommunicationData {
  clientId: string;
  type: CommunicationType;
  subject?: string;
  participants?: string[];
  notes?: string;
  date: Date;
  duration?: number;
  attachments?: string[];
  userId: string;
}

/**
 * Get communications for a client
 *
 * @param clientId - Client ID
 * @param limit - Maximum number of communications to return
 * @returns Array of communications
 */
export async function getClientCommunications(
  clientId: string,
  limit: number = 50
): Promise<CommunicationListItem[]> {
  const snapshot = await collections
    .communications()
    .where('clientId', '==', clientId)
    .orderBy('date', 'desc')
    .limit(limit)
    .get();

  const communications = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const user = await getUserById(data.userId);

      return {
        id: doc.id,
        type: data.type as CommunicationType,
        subject: data.subject || null,
        date: timestampToDate(data.date) || new Date(),
        duration: data.duration || null,
        userId: data.userId,
        user: {
          displayName: user?.displayName || 'Unknown',
        },
      };
    })
  );

  return communications;
}

/**
 * Create a communication entry
 *
 * @param data - Communication data
 * @returns Created communication
 */
export async function createCommunication(data: CreateCommunicationData) {
  const id = generateId();
  const communicationData = {
    id,
    clientId: data.clientId,
    type: data.type,
    subject: data.subject || null,
    participants: data.participants || null,
    notes: data.notes || null,
    date: data.date,
    duration: data.duration || null,
    attachments: data.attachments || null,
    userId: data.userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.communications().doc(id).set(communicationData);

  return {
    id,
    ...communicationData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get a single communication by ID
 */
export async function getCommunicationById(id: string) {
  const doc = await collections.communications().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  const user = await getUserById(data.userId);

  return {
    id: doc.id,
    ...toPlainObject(data),
    date: timestampToDate(data.date) || new Date(),
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    user: {
      displayName: user?.displayName || 'Unknown',
      email: user?.email || '',
    },
    actionItems: [], // TODO: Implement action items if needed
  };
}
