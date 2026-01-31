/**
 * Layout Service
 *
 * Provides operations for managing interior planning layouts.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { getClientById } from './clients';

export interface LayoutListItem {
  id: string;
  clientId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  floorPlanUrl: string | null;
  layoutData: Record<string, unknown> | null;
  createdAt: Date;
  client: {
    id: string;
    companyName: string;
  };
  project: {
    id: string;
    name: string;
  } | null;
}

export interface CreateLayoutData {
  clientId: string;
  projectId?: string;
  name: string;
  description?: string;
  floorPlanUrl?: string;
  layoutData?: Record<string, unknown>;
}

/**
 * Get layouts with pagination
 */
export async function getLayouts(options?: {
  page?: number;
  limit?: number;
  clientId?: string;
  projectId?: string;
}): Promise<{ layouts: LayoutListItem[]; total: number }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

  let query = collections.layouts() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options?.clientId) {
    query = query.where('clientId', '==', options.clientId);
  }

  if (options?.projectId) {
    query = query.where('projectId', '==', options.projectId);
  }

  let snapshot;
  let docs: FirebaseFirestore.QueryDocumentSnapshot[];
  try {
    // Try to order by createdAt
    const orderedQuery = query.orderBy('createdAt', 'desc');
    snapshot = await orderedQuery.get();
    docs = snapshot.docs;
  } catch (error) {
    // If orderBy fails (e.g., no index or field doesn't exist), query without ordering
    console.warn('Could not order by createdAt, querying without order:', error);
    snapshot = await query.get();
    // Sort client-side by createdAt if available
    docs = [...snapshot.docs].sort((a, b) => {
      const aDate = timestampToDate(a.data().createdAt);
      const bDate = timestampToDate(b.data().createdAt);
      if (!aDate || !bDate) return 0;
      return bDate.getTime() - aDate.getTime(); // desc
    });
  }

  const total = snapshot.size;

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const paginatedDocs = docs.slice(startIndex, startIndex + limit);

  const layouts = await Promise.all(
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

      return {
        id: doc.id,
        clientId: data.clientId || '',
        projectId: data.projectId || null,
        name: data.name || 'Unnamed Layout',
        description: data.description || null,
        floorPlanUrl: data.floorPlanUrl || null,
        layoutData: (data.layoutData as Record<string, unknown>) || null,
        createdAt: timestampToDate(data.createdAt) || new Date(),
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

    return { layouts, total };
  } catch (error) {
    console.error('Error in getLayouts:', error);
    // Return empty result instead of throwing
    return { layouts: [], total: 0 };
  }
}

/**
 * Get a single layout by ID
 */
export async function getLayoutById(id: string) {
  const doc = await collections.layouts().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;

  // Get related data
  const [client, project] = await Promise.all([
    getClientById(data.clientId),
    data.projectId ? collections.projects().doc(data.projectId).get() : null,
  ]);

  // Get products (if stored as references)
  const products: any[] = []; // TODO: Implement product relationships if needed

  return {
    id: doc.id,
    ...toPlainObject(data),
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
    products,
  };
}

/**
 * Create a new layout
 */
export async function createLayout(data: CreateLayoutData) {
  const id = generateId();
  const layoutData = {
    id,
    clientId: data.clientId,
    projectId: data.projectId || null,
    name: data.name,
    description: data.description || null,
    floorPlanUrl: data.floorPlanUrl || null,
    layoutData: data.layoutData || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.layouts().doc(id).set(layoutData);

  // Get related data for return
  const [client, project] = await Promise.all([
    getClientById(data.clientId),
    data.projectId ? collections.projects().doc(data.projectId).get() : null,
  ]);

  return {
    id,
    ...layoutData,
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
 * Update a layout
 */
export async function updateLayout(
  id: string,
  data: Partial<CreateLayoutData> & {
    layoutData?: Record<string, unknown>;
  }
) {
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.floorPlanUrl !== undefined) updateData.floorPlanUrl = data.floorPlanUrl;
  if (data.layoutData !== undefined) updateData.layoutData = data.layoutData;

  await collections.layouts().doc(id).update(updateData);

  // Get updated layout with related data
  const layout = await getLayoutById(id);
  if (!layout) {
    throw new Error('Layout not found');
  }

  // Get client and project for return
  const [client, project] = await Promise.all([
    getClientById(layout.clientId),
    layout.projectId ? collections.projects().doc(layout.projectId).get() : null,
  ]);

  return {
    ...layout,
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
 * Delete a layout
 */
export async function deleteLayout(id: string): Promise<void> {
  await collections.layouts().doc(id).delete();
}
