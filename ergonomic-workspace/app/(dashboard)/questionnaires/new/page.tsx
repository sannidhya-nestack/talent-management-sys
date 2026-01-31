/**
 * New Questionnaire Page
 *
 * Create a new questionnaire template.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewQuestionnairePageClient } from './page-client';

export const metadata = {
  title: 'Create Questionnaire',
};

export default async function NewQuestionnairePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <NewQuestionnairePageClient />;
}
