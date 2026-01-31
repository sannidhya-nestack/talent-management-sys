/**
 * Accounting Integration Settings Page
 *
 * Configure accounting integrations (QuickBooks, Xero).
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AccountingIntegrationSettingsPageClient } from './page-client';

export const metadata = {
  title: 'Accounting Integration Settings',
};

export default async function AccountingIntegrationSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <AccountingIntegrationSettingsPageClient />;
}
