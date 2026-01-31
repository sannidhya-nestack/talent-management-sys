/**
 * Email Integration Settings Page
 *
 * Configure email integrations (Gmail, Outlook).
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmailIntegrationSettingsPageClient } from './page-client';

export const metadata = {
  title: 'Email Integration Settings',
};

export default async function EmailIntegrationSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <EmailIntegrationSettingsPageClient />;
}
