/**
 * Settings Page
 *
 * User settings and platform configuration.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsPageClient } from './page-client';

export const metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <SettingsPageClient />;
}
