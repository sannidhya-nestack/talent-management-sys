/**
 * Communication Service
 *
 * Provides operations for logging and managing communications.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { CommunicationType } from '@/lib/types/firestore';
import { getUserById } from './users';

export interface ActionItem {
  id: string;
  description: string;
  assignedTo: string | null;
  dueDate: Date | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt: Date | null;
  completedBy: string | null;
}

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
  actionItemsCount?: number;
  attachmentsCount?: number;
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
  actionItems?: Omit<ActionItem, 'id'>[];
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
  let snapshot;
  let docs: FirebaseFirestore.QueryDocumentSnapshot[];

  try {
    snapshot = await collections
      .communications()
      .where('clientId', '==', clientId)
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    docs = snapshot.docs;
  } catch (error) {
    console.warn('Could not order by date, querying without order:', error);
    snapshot = await collections
      .communications()
      .where('clientId', '==', clientId)
      .limit(limit)
      .get();
    docs = [...snapshot.docs].sort((a, b) => {
      const aDate = timestampToDate(a.data().date);
      const bDate = timestampToDate(b.data().date);
      if (!aDate || !bDate) return 0;
      return bDate.getTime() - aDate.getTime(); // desc
    });
  }

  const communications = await Promise.all(
    docs.map(async (doc) => {
      const data = doc.data();
      const user = await getUserById(data.userId);
      const actionItems = (data.actionItems as ActionItem[] | null) || [];
      const attachments = (data.attachments as string[] | null) || [];

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
        actionItemsCount: actionItems.length,
        attachmentsCount: attachments.length,
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
  
  // Generate IDs for action items
  const actionItems = data.actionItems?.map((item) => ({
    ...item,
    id: generateId(),
  })) || [];

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
    actionItems: actionItems.length > 0 ? actionItems : null,
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
    actionItems,
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
  const actionItems = ((data.actionItems as ActionItem[] | null) || []).map((item) => ({
    ...item,
    dueDate: item.dueDate ? timestampToDate(item.dueDate) : null,
    completedAt: item.completedAt ? timestampToDate(item.completedAt) : null,
  }));

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
    actionItems,
    attachments: (data.attachments as string[] | null) || [],
  };
}

/**
 * Update an action item status
 */
export async function updateActionItem(
  communicationId: string,
  actionItemId: string,
  updates: Partial<ActionItem>,
  userId: string
) {
  const doc = await collections.communications().doc(communicationId).get();

  if (!doc.exists) {
    throw new Error('Communication not found');
  }

  const data = doc.data()!;
  const actionItems = ((data.actionItems as ActionItem[] | null) || []).map((item) => {
    if (item.id === actionItemId) {
      return {
        ...item,
        ...updates,
        completedAt: updates.status === 'COMPLETED' ? new Date() : item.completedAt,
        completedBy: updates.status === 'COMPLETED' ? userId : item.completedBy,
      };
    }
    return item;
  });

  await collections.communications().doc(communicationId).update({
    actionItems,
    updatedAt: serverTimestamp(),
  });

  return actionItems.find((item) => item.id === actionItemId);
}
