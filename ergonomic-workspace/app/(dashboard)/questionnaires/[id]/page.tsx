/**
 * Questionnaire Detail Page
 *
 * View and edit a questionnaire template.
 */

import { redirect } from 'next/navigation';
import { getQuestionnaireById } from '@/lib/services/questionnaires';
import { EditQuestionnairePageClient } from './page-client';

export default async function QuestionnaireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate ID is not empty
  if (!id || id.trim().length === 0) {
    redirect('/questionnaires');
  }

  const questionnaire = await getQuestionnaireById(id);

  if (!questionnaire) {
    redirect('/questionnaires');
  }

  return <EditQuestionnairePageClient questionnaire={questionnaire} />;
}
