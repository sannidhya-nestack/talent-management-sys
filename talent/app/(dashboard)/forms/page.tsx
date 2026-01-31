/**
 * Forms Management Page
 *
 * Lists all application forms with options to create, edit, and delete.
 * Admin only.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FormsPageClient } from './page-client';

export const metadata = {
  title: 'Forms',
};

export default async function FormsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  if (!session.user.isAdmin) {
    redirect('/dashboard');
  }

  return <FormsPageClient />;
}
