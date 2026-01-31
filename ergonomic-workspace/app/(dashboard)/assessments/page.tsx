/**
 * Assessments Page
 *
 * List of workspace assessments.
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

  return <AssessmentsPageClient />;
}
