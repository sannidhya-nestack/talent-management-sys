/**
 * Questionnaire Responses Page
 *
 * View all responses for a questionnaire template.
 */

import { redirect } from 'next/navigation';
import { getQuestionnaireById } from '@/lib/services/questionnaires';
import { QuestionnaireResponsesPageClient } from './page-client';

export default async function QuestionnaireResponsesPage({
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

  return <QuestionnaireResponsesPageClient questionnaire={questionnaire} />;
}
