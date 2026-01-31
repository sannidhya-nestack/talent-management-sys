/**
 * Client Service
 *
 * Provides CRUD operations for managing clients.
 * Handles database operations and business logic for clients.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { ClientStatus, BudgetRange } from '@/lib/types/firestore';

export interface ClientListItem {
  id: string;
  companyName: string;
  industry: string | null;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    projects: number;
    assessments: number;
    documents: number;
    invoices: number;
  };
}

export interface ClientDetail {
  id: string;
  companyName: string;
  industry: string | null;
  status: ClientStatus;
  initialScope: string | null;
  budgetRange: BudgetRange | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  website: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  contacts: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    isPrimary: boolean;
  }>;
}

export interface CreateClientData {
  companyName: string;
  industry?: string;
  status?: ClientStatus;
  initialScope?: string;
  budgetRange?: BudgetRange;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateClientData {
  companyName?: string;
  industry?: string;
  status?: ClientStatus;
  initialScope?: string;
  budgetRange?: BudgetRange;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  notes?: string;
}

export interface ClientFilters {
  status?: ClientStatus;
  industry?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClientsListResponse {
  clients: ClientListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get all clients with optional filtering and pagination
 *
 * @param filters - Filter options
 * @returns Paginated list of clients
 */
export async function getClients(filters?: ClientFilters): Promise<ClientsListResponse> {
  const {
    status,
    industry,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters || {};

  let query = collections.clients() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (status) {
    query = query.where('status', '==', status);
  }

  if (industry) {
    query = query.where('industry', '==', industry);
  }

  // Note: Firestore doesn't support OR queries or full-text search natively
  // For search, we'd need to use a search service or filter client-side
  // For now, we'll do a simple companyName search if provided
  if (search) {
    // Firestore doesn't support case-insensitive contains, so we'll filter client-side
    // In production, consider using Algolia or similar for full-text search
  }

  // Apply ordering
  query = query.orderBy(sortBy, sortOrder);

  // Get all documents (we'll paginate client-side for now)
  // Note: Firestore pagination is done with startAfter, but for simplicity we'll get all and paginate
  const snapshot = await query.get();

  let clients = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...toPlainObject(data),
      createdAt: timestampToDate(data.createdAt) || new Date(),
      updatedAt: timestampToDate(data.updatedAt) || new Date(),
    };
  });

  // Apply search filter client-side if needed
  if (search) {
    const searchLower = search.toLowerCase();
    clients = clients.filter(
      (client) =>
        client.companyName?.toLowerCase().includes(searchLower) ||
        client.industry?.toLowerCase().includes(searchLower) ||
        client.city?.toLowerCase().includes(searchLower) ||
        client.state?.toLowerCase().includes(searchLower)
    );
  }

  const total = clients.length;

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const paginatedClients = clients.slice(startIndex, startIndex + limit);

  // Get counts for each client
  const clientsWithCounts = await Promise.all(
    paginatedClients.map(async (client) => {
      const [projects, assessments, documents, invoices] = await Promise.all([
        collections.projects().where('clientId', '==', client.id).get(),
        collections.assessments().where('clientId', '==', client.id).get(),
        collections.documents().where('clientId', '==', client.id).get(),
        collections.invoices().where('clientId', '==', client.id).get(),
      ]);

      return {
        ...client,
        _count: {
          projects: projects.size,
          assessments: assessments.size,
          documents: documents.size,
          invoices: invoices.size,
        },
      } as ClientListItem;
    })
  );

  return {
    clients: clientsWithCounts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single client by ID
 *
 * @param id - Client ID (UUID)
 * @returns Client detail or null if not found
 */
export async function getClientById(id: string): Promise<ClientDetail | null> {
  const clientDoc = await collections.clients().doc(id).get();

  if (!clientDoc.exists) {
    return null;
  }

  const clientData = clientDoc.data()!;

  // Get contacts
  const contactsSnapshot = await collections.contacts()
    .where('clientId', '==', id)
    .get();

  const contacts = contactsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      jobTitle: data.jobTitle || null,
      isPrimary: data.isPrimary || false,
    };
  });

  // Sort contacts by isPrimary
  contacts.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

  return {
    id: clientDoc.id,
    ...toPlainObject(clientData),
    createdAt: timestampToDate(clientData.createdAt) || new Date(),
    updatedAt: timestampToDate(clientData.updatedAt) || new Date(),
    contacts,
  } as ClientDetail;
}

/**
 * Create a new client
 *
 * @param data - Client data
 * @returns Created client
 */
export async function createClient(data: CreateClientData) {
  const id = generateId();
  const clientData = {
    id,
    companyName: data.companyName,
    industry: data.industry || null,
    status: data.status || ClientStatus.ACTIVE,
    initialScope: data.initialScope || null,
    budgetRange: data.budgetRange || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    country: data.country || null,
    postalCode: data.postalCode || null,
    website: data.website || null,
    notes: data.notes || null,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.clients().doc(id).set(clientData);

  return getClientById(id) as Promise<ClientDetail>;
}

/**
 * Update a client
 *
 * @param id - Client ID
 * @param data - Update data
 * @returns Updated client
 */
export async function updateClient(id: string, data: UpdateClientData) {
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.industry !== undefined) updateData.industry = data.industry;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.initialScope !== undefined) updateData.initialScope = data.initialScope;
  if (data.budgetRange !== undefined) updateData.budgetRange = data.budgetRange;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await collections.clients().doc(id).update(updateData);

  return getClientById(id) as Promise<ClientDetail>;
}

/**
 * Delete a client
 *
 * @param id - Client ID
 */
export async function deleteClient(id: string) {
  await collections.clients().doc(id).delete();
}
