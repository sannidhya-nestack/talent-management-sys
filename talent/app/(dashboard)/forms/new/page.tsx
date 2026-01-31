/**
 * New Form Page
 *
 * Create a new application form from template or custom.
 * Admin only.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewFormPageClient } from './page-client';

export const metadata = {
  title: 'Create Form',
};

export default async function NewFormPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  if (!session.user.isAdmin) {
    redirect('/dashboard');
  }

  return <NewFormPageClient />;
}
