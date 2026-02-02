/**
 * Clients List Page
 *
 * Displays a list of all clients with filtering and search capabilities.
 */

import { ClientsPageClient } from './page-client';
import { getClients } from '@/lib/services/clients';
import { ClientStatus } from '@/lib/types/firestore';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = parseInt((params.page as string) || '1', 10);
  const limit = parseInt((params.limit as string) || '20', 10);
  const status = params.status as ClientStatus | undefined;
  const industry = params.industry as string | undefined;
  const search = params.search as string | undefined;
  const sortBy = (params.sortBy as string) || 'createdAt';
  const sortOrder = (params.sortOrder as 'asc' | 'desc') || 'desc';

  let result;
  try {
    result = await getClients({
      status,
      industry,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching clients:', errorMessage);
    
    // Check if it's a Firebase configuration error
    if (errorMessage.includes('DECODER') || 
        errorMessage.includes('Missing required Firebase') ||
        errorMessage.includes('FIREBASE_ADMIN')) {
      console.error(
        '\n⚠️  Firebase Admin is not properly configured.\n' +
        'Please check your .env file and ensure FIREBASE_ADMIN_PRIVATE_KEY, ' +
        'FIREBASE_ADMIN_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set correctly.\n' +
        'See FIREBASE_SETUP.md for detailed instructions.\n'
      );
    }
    
    // Return empty result if database is not configured
    result = { clients: [], total: 0, page, limit, totalPages: 0 };
  }

  return <ClientsPageClient initialData={result} />;
}
