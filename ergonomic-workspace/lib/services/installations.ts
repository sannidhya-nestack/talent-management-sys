/**
 * Installation Service
 *
 * Provides operations for managing installations.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { InstallationStatus, DeliveryStatus } from '@/lib/types/firestore';
import { getClientById } from './clients';

export interface DeliveryUpdate {
  status: DeliveryStatus;
  date: Date;
  location?: string;
  notes?: string;
  photos?: string[];
  signature?: string; // Base64 encoded signature image
  confirmedBy?: string;
}

export interface InstallationListItem {
  id: string;
  clientId: string;
  projectId: string | null;
  scheduledDate: Date;
  status: InstallationStatus;
  deliveryStatus?: DeliveryStatus;
  deliveryDate: Date | null;
  deliveryUpdates?: DeliveryUpdate[];
  completionDate: Date | null;
  photos?: string[];
  client: {
    id: string;
    companyName: string;
  };
  project: {
    id: string;
    name: string;
  } | null;
}

export interface CreateInstallationData {
  clientId: string;
  projectId?: string;
  scheduledDate: Date;
  deliveryDate?: Date;
  teamMembers?: string[];
  notes?: string;
}

/**
 * Get installations with pagination
 */
export async function getInstallations(options?: {
  page?: number;
  limit?: number;
  clientId?: string;
  projectId?: string;
  status?: InstallationStatus;
}): Promise<{ installations: InstallationListItem[]; total: number }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

  let query = collections.installations() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options?.clientId) {
    query = query.where('clientId', '==', options.clientId);
  }

  if (options?.projectId) {
    query = query.where('projectId', '==', options.projectId);
  }

  if (options?.status) {
    query = query.where('status', '==', options.status);
  }

  let snapshot;
  let docs: FirebaseFirestore.QueryDocumentSnapshot[];
  try {
    // Try to order by scheduledDate
    const orderedQuery = query.orderBy('scheduledDate', 'asc');
    snapshot = await orderedQuery.get();
    docs = snapshot.docs;
  } catch (error) {
    // If orderBy fails (e.g., no index or field doesn't exist), query without ordering
    console.warn('Could not order by scheduledDate, querying without order:', error);
    snapshot = await query.get();
    // Sort client-side by scheduledDate if available
    docs = [...snapshot.docs].sort((a, b) => {
      const aDate = timestampToDate(a.data().scheduledDate);
      const bDate = timestampToDate(b.data().scheduledDate);
      if (!aDate || !bDate) return 0;
      return aDate.getTime() - bDate.getTime(); // asc
    });
  }

  const total = snapshot.size;

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const paginatedDocs = docs.slice(startIndex, startIndex + limit);

  const installations = await Promise.all(
    paginatedDocs.map(async (doc) => {
      const data = doc.data();

      // Get related data (use nested data if available, otherwise fetch)
      let client = data.client ? { id: data.client.id, companyName: data.client.companyName } : null;
      let project = data.project ? { id: data.project.id, name: data.project.name } : null;

      if (!client && data.clientId) {
        try {
          const fetchedClient = await getClientById(data.clientId);
          if (fetchedClient) {
            client = { id: fetchedClient.id, companyName: fetchedClient.companyName };
          }
        } catch (error) {
          console.warn('Could not fetch client:', error);
        }
      }

      if (!project && data.projectId) {
        try {
          const projectDoc = await collections.projects().doc(data.projectId).get();
          if (projectDoc.exists) {
            const projectData = projectDoc.data();
            project = { id: projectDoc.id, name: projectData?.name || 'Unknown' };
          }
        } catch (error) {
          console.warn('Could not fetch project:', error);
        }
      }

      const deliveryUpdates = (data.deliveryUpdates as DeliveryUpdate[] | null) || [];
      const deliveryUpdatesWithDates = deliveryUpdates.map((update) => ({
        ...update,
        date: timestampToDate(update.date) || new Date(),
      }));

      return {
        id: doc.id,
        clientId: data.clientId || '',
        projectId: data.projectId || null,
        scheduledDate: timestampToDate(data.scheduledDate) || new Date(),
        status: (data.status as InstallationStatus) || 'SCHEDULED',
        deliveryStatus: (data.deliveryStatus as DeliveryStatus) || undefined,
        deliveryDate: timestampToDate(data.deliveryDate) || null,
        deliveryUpdates: deliveryUpdatesWithDates.length > 0 ? deliveryUpdatesWithDates : undefined,
        completionDate: timestampToDate(data.completionDate) || null,
        photos: (data.photos as string[] | null) || undefined,
        client: {
          id: client?.id || data.clientId || '',
          companyName: client?.companyName || 'Unknown',
        },
        project: project
          ? {
              id: project.id,
              name: project.name,
            }
          : null,
      };
    })
  );

    return { installations, total };
  } catch (error) {
    console.error('Error in getInstallations:', error);
    // Return empty result instead of throwing
    return { installations: [], total: 0 };
  }
}

/**
 * Get a single installation by ID
 */
export async function getInstallationById(id: string) {
  const doc = await collections.installations().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;

  // Get related data
  const [client, project] = await Promise.all([
    getClientById(data.clientId),
    data.projectId ? collections.projects().doc(data.projectId).get() : null,
  ]);

  const deliveryUpdates = ((data.deliveryUpdates as DeliveryUpdate[] | null) || []).map((update) => ({
    ...update,
    date: timestampToDate(update.date) || new Date(),
  }));

  return {
    id: doc.id,
    ...toPlainObject(data),
    scheduledDate: timestampToDate(data.scheduledDate) || new Date(),
    deliveryStatus: (data.deliveryStatus as DeliveryStatus) || undefined,
    deliveryDate: timestampToDate(data.deliveryDate),
    deliveryUpdates: deliveryUpdates.length > 0 ? deliveryUpdates : undefined,
    completionDate: timestampToDate(data.completionDate),
    photos: (data.photos as string[] | null) || undefined,
    createdAt: timestampToDate(data.createdAt) || new Date(),
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
  };
}

/**
 * Create a new installation
 */
export async function createInstallation(data: CreateInstallationData) {
  const id = generateId();
  const installationData = {
    id,
    clientId: data.clientId,
    projectId: data.projectId || null,
    scheduledDate: data.scheduledDate,
    deliveryDate: data.deliveryDate || null,
    teamMembers: data.teamMembers || null,
    notes: data.notes || null,
    status: InstallationStatus.SCHEDULED,
    completionDate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.installations().doc(id).set(installationData);

  // Get related data for return
  const [client, project] = await Promise.all([
    getClientById(data.clientId),
    data.projectId ? collections.projects().doc(data.projectId).get() : null,
  ]);

  return {
    id,
    ...installationData,
    scheduledDate: data.scheduledDate,
    deliveryDate: data.deliveryDate || null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
  };
}

/**
 * Update an installation
 */
export async function updateInstallation(
  id: string,
  data: Partial<CreateInstallationData> & {
    status?: InstallationStatus;
    deliveryStatus?: DeliveryStatus;
    completionDate?: Date;
    photos?: string[];
  }
) {
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.scheduledDate) updateData.scheduledDate = data.scheduledDate;
  if (data.deliveryDate !== undefined) updateData.deliveryDate = data.deliveryDate;
  if (data.status) updateData.status = data.status;
  if (data.deliveryStatus) updateData.deliveryStatus = data.deliveryStatus;
  if (data.completionDate !== undefined) updateData.completionDate = data.completionDate;
  if (data.teamMembers !== undefined) updateData.teamMembers = data.teamMembers;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.photos !== undefined) updateData.photos = data.photos;

  await collections.installations().doc(id).update(updateData);
}

/**
 * Add a delivery status update
 */
export async function addDeliveryUpdate(
  installationId: string,
  update: DeliveryUpdate,
  userId: string
) {
  const doc = await collections.installations().doc(installationId).get();

  if (!doc.exists) {
    throw new Error('Installation not found');
  }

  const data = doc.data()!;
  const existingUpdates = ((data.deliveryUpdates as DeliveryUpdate[] | null) || []).map((u) => ({
    ...u,
    date: timestampToDate(u.date) || new Date(),
  }));

  const newUpdate: DeliveryUpdate = {
    ...update,
    confirmedBy: userId,
  };

  await collections.installations().doc(installationId).update({
    deliveryStatus: update.status,
    deliveryUpdates: [...existingUpdates, newUpdate],
    deliveryDate: update.status === DeliveryStatus.DELIVERED_TO_SITE ? update.date : data.deliveryDate,
    updatedAt: serverTimestamp(),
  });

  return newUpdate;
}

  // Get updated installation with related data
  const installation = await getInstallationById(id);
  if (!installation) {
    throw new Error('Installation not found');
  }

  // Get client and project for return
  const [client, project] = await Promise.all([
    getClientById(installation.clientId),
    installation.projectId ? collections.projects().doc(installation.projectId).get() : null,
  ]);

  return {
    ...installation,
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
  };
}

/**
 * Delete an installation
 */
export async function deleteInstallation(id: string): Promise<void> {
  await collections.installations().doc(id).delete();
}
