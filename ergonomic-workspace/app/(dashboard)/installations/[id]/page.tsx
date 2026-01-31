/**
 * Installation Detail Page
 *
 * Displays detailed information about an installation with ability to edit.
 */

import { redirect } from 'next/navigation';
import { getInstallationById } from '@/lib/services/installations';
import { InstallationDetailPageClient } from './page-client';

export default async function InstallationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate ID is not empty
  if (!id || id.trim().length === 0) {
    redirect('/installations');
  }

  const installation = await getInstallationById(id);

  if (!installation) {
    redirect('/installations');
  }

  return <InstallationDetailPageClient installation={installation} />;
}
