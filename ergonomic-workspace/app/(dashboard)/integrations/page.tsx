/**
 * Integrations Page
 *
 * Manage third-party integrations (email, calendar, accounting).
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { IntegrationsPageClient } from './page-client';

export const metadata = {
  title: 'Integrations',
};

export default async function IntegrationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <IntegrationsPageClient />;
}
