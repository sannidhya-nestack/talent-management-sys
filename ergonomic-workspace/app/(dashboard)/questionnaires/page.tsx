/**
 * Questionnaires Management Page
 *
 * Lists all questionnaire templates with options to create, edit, and manage.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { QuestionnairesPageClient } from './page-client';

export const metadata = {
  title: 'Questionnaires',
};

export default async function QuestionnairesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <QuestionnairesPageClient />;
}
