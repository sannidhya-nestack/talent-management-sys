/**
 * Activity Service
 *
 * Provides operations for managing activity feed entries.
 * Activities track all significant events related to clients, assessments, etc.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { ActivityType } from '@/lib/types/firestore';
import { getUserById } from './users';

export interface ActivityListItem {
  id: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown> | null;
  userId: string;
  createdAt: Date;
  user: {
    displayName: string;
    email: string;
  };
}

export interface CreateActivityData {
  clientId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  userId: string;
}

/**
 * Get activities for a client
 *
 * @param clientId - Client ID
 * @param limit - Maximum number of activities to return
 * @returns Array of activities
 */
export async function getClientActivities(
  clientId: string,
  limit: number = 50
): Promise<ActivityListItem[]> {
  let snapshot;
  let docs: FirebaseFirestore.QueryDocumentSnapshot[];

  try {
    // Try to order by createdAt
    const orderedQuery = collections
      .activities()
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    snapshot = await orderedQuery.get();
    docs = snapshot.docs;
  } catch (error) {
    // If orderBy fails (e.g., no index or field doesn't exist), query without ordering
    console.warn('Could not order by createdAt, querying without order:', error);
    snapshot = await collections
      .activities()
      .where('clientId', '==', clientId)
      .limit(limit)
      .get();
    // Sort client-side by createdAt if available
    docs = [...snapshot.docs].sort((a, b) => {
      const aDate = timestampToDate(a.data().createdAt);
      const bDate = timestampToDate(b.data().createdAt);
      if (!aDate || !bDate) return 0;
      return bDate.getTime() - aDate.getTime(); // desc
    });
  }

  const activities = await Promise.all(
    docs.map(async (doc) => {
      const data = doc.data();
      const user = await getUserById(data.userId);

      return {
        id: doc.id,
        type: data.type as ActivityType,
        description: data.description,
        metadata: (data.metadata as Record<string, unknown>) || null,
        userId: data.userId,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        user: {
          displayName: user?.displayName || 'Unknown',
          email: user?.email || '',
        },
      };
    })
  );

  return activities;
}

/**
 * Create an activity entry
 *
 * @param data - Activity data
 * @returns Created activity
 */
export async function createActivity(data: CreateActivityData) {
  const id = generateId();
  const activityData = {
    id,
    clientId: data.clientId,
    type: data.type,
    description: data.description,
    metadata: data.metadata || null,
    userId: data.userId,
    createdAt: serverTimestamp(),
  };

  await collections.activities().doc(id).set(activityData);

  return {
    id,
    ...activityData,
    createdAt: new Date(),
  };
}

/**
 * Create an activity for client creation
 */
export async function logClientCreatedActivity(
  clientId: string,
  userId: string,
  companyName: string
) {
  return createActivity({
    clientId,
    type: 'STATUS_CHANGE',
    description: `Client "${companyName}" was created`,
    userId,
    metadata: { companyName },
  });
}

/**
 * Create an activity for assessment creation
 */
export async function logAssessmentCreatedActivity(
  clientId: string,
  userId: string,
  assessmentType: string
) {
  return createActivity({
    clientId,
    type: 'ASSESSMENT',
    description: `New ${assessmentType} assessment was created`,
    userId,
    metadata: { assessmentType },
  });
}

/**
 * Create an activity for document upload
 */
export async function logDocumentUploadActivity(
  clientId: string,
  userId: string,
  fileName: string,
  category: string
) {
  return createActivity({
    clientId,
    type: 'DOCUMENT',
    description: `Document "${fileName}" was uploaded`,
    userId,
    metadata: { fileName, category },
  });
}

/**
 * Create an activity for payment received
 */
export async function logPaymentActivity(
  clientId: string,
  userId: string,
  amount: number,
  invoiceNumber: string
) {
  return createActivity({
    clientId,
    type: 'PAYMENT',
    description: `Payment of $${amount.toFixed(2)} received for invoice ${invoiceNumber}`,
    userId,
    metadata: { amount, invoiceNumber },
  });
}

/**
 * Create an activity for communication logged
 */
export async function logCommunicationActivity(
  clientId: string,
  userId: string,
  type: string,
  subject?: string
) {
  return createActivity({
    clientId,
    type: 'COMMUNICATION',
    description: `${type}${subject ? `: ${subject}` : ''} was logged`,
    userId,
    metadata: { communicationType: type, subject },
  });
}
