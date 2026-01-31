/**
 * Shared Document Page
 *
 * Public page for accessing shared documents via token.
 */

import { redirect } from 'next/navigation';
import { getShareByToken, verifySharePassword, recordShareAccess, getShareAccessLogs } from '@/lib/services/documents/sharing';
import { getDocumentById } from '@/lib/services/documents';
import { SharedDocumentView } from './page-client';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export default async function SharedDocumentPage({ params }: RouteParams) {
  const { token } = await params;

  // Get share
  const share = await getShareByToken(token);
  if (!share) {
    redirect('/shared/expired');
  }

  // Get document
  const document = await getDocumentById(share.documentId);
  if (!document) {
    redirect('/shared/not-found');
  }

  // Record access (without IP/user agent for now, can be added later)
  await recordShareAccess(share.id);

  return <SharedDocumentView document={document} share={share} />;
}
