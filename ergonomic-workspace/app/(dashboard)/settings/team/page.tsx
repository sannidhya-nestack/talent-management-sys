/**
 * Team Settings Page
 *
 * Team management and permissions.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TeamSettingsPageClient } from './page-client';

export const metadata = {
  title: 'Team Settings',
};

export default async function TeamSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <TeamSettingsPageClient />;
}
