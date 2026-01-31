/**
 * New Installation Page
 *
 * Schedule a new installation.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewInstallationPageClient } from './page-client';

export const metadata = {
  title: 'Schedule Installation',
};

export default async function NewInstallationPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <NewInstallationPageClient />;
}
