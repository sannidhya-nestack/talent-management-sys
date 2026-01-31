/**
 * Public Questionnaire Page
 *
 * Clients take questionnaires here.
 * URL format: /questionnaire/[slug]
 */

import { notFound } from 'next/navigation';
import { getPublicQuestionnaire, getPublicQuestions } from '@/lib/services/questionnaires';
import { QuestionnairePageClient } from './page-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const questionnaire = await getPublicQuestionnaire(slug);

  if (!questionnaire) {
    return { title: 'Questionnaire Not Found' };
  }

  return {
    title: questionnaire.name,
    description: questionnaire.description || `Take the ${questionnaire.name} questionnaire`,
  };
}

export default async function QuestionnairePage({ params }: PageProps) {
  const { slug } = await params;

  const questionnaire = await getPublicQuestionnaire(slug);

  if (!questionnaire) {
    notFound();
  }

  const questions = await getPublicQuestions(questionnaire.id);

  return (
    <QuestionnairePageClient
      questionnaire={questionnaire}
      questions={questions}
      slug={slug}
    />
  );
}
