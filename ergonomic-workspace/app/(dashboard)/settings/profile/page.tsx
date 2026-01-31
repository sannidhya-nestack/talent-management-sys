/**
 * Profile Settings Page
 *
 * User profile settings and preferences.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProfileSettingsPageClient } from './page-client';

export const metadata = {
  title: 'Profile Settings',
};

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <ProfileSettingsPageClient user={session.user} />;
}
