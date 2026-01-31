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

  const result = await getClients({
    status,
    industry,
    search,
    page,
    limit,
    sortBy,
    sortOrder,
  });

  return <ClientsPageClient initialData={result} />;
}
