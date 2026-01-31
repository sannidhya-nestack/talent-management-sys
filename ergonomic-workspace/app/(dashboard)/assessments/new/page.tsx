/**
 * New Assessment Page
 *
 * Create a new assessment.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewAssessmentPageClient } from './page-client';

export const metadata = {
  title: 'Create Assessment',
};

export default async function NewAssessmentPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <NewAssessmentPageClient />;
}
