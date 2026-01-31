/**
 * Calendar Integration Settings Page
 *
 * Configure calendar integrations (Google Calendar, Outlook).
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CalendarIntegrationSettingsPageClient } from './page-client';

export const metadata = {
  title: 'Calendar Integration Settings',
};

export default async function CalendarIntegrationSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <CalendarIntegrationSettingsPageClient />;
}
