/**
 * Installations Page
 *
 * Lists all installations and provides scheduling interface.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InstallationsPageClient } from './page-client';

export const metadata = {
  title: 'Installations',
};

export default async function InstallationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <InstallationsPageClient />;
}
