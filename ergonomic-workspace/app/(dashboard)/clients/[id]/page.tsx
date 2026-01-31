/**
 * Client Detail Page
 *
 * Displays detailed information about a client with tabs for different views.
 */

import { redirect } from 'next/navigation';
import { getClientById } from '@/lib/services/clients';
import { ClientDetailPageClient } from './page-client';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate ID is not empty
  if (!id || id.trim().length === 0) {
    redirect('/clients');
  }

  const client = await getClientById(id);

  if (!client) {
    redirect('/clients');
  }

  return <ClientDetailPageClient client={client} />;
}
