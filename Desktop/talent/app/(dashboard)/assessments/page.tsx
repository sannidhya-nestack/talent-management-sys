/**
 * Assessments Management Page
 *
 * Lists all assessment templates with options to create, edit, and delete.
 * Admin only.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AssessmentsPageClient } from './page-client';

export const metadata = {
  title: 'Assessments',
};

export default async function AssessmentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  if (!session.user.isAdmin) {
    redirect('/dashboard');
  }

  return <AssessmentsPageClient />;
}
