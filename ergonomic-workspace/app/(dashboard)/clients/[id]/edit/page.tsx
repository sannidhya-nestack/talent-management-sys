/**
 * Edit Client Page
 *
 * Edit an existing client's information.
 */

import { redirect } from 'next/navigation';
import { getClientById } from '@/lib/services/clients';
import { EditClientPageClient } from './page-client';

export default async function EditClientPage({
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

  return <EditClientPageClient client={client} />;
}
