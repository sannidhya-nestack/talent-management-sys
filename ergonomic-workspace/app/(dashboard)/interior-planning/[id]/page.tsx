/**
 * Layout Detail Page
 *
 * Displays detailed information about a layout with ability to edit.
 */

import { redirect } from 'next/navigation';
import { getLayoutById } from '@/lib/services/layouts';
import { LayoutDetailPageClient } from './page-client';

export default async function LayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate ID is not empty
  if (!id || id.trim().length === 0) {
    redirect('/interior-planning');
  }

  const layout = await getLayoutById(id);

  if (!layout) {
    redirect('/interior-planning');
  }

  return <LayoutDetailPageClient layout={layout} />;
}
