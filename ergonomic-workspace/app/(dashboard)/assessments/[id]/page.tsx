/**
 * Assessment Detail Page
 *
 * Displays detailed information about an assessment with ability to edit.
 */

import { redirect } from 'next/navigation';
import { getAssessmentById } from '@/lib/services/assessments';
import { AssessmentDetailPageClient } from './page-client';

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate ID is not empty
  if (!id || id.trim().length === 0) {
    redirect('/assessments');
  }

  const assessment = await getAssessmentById(id);

  if (!assessment) {
    redirect('/assessments');
  }

  return <AssessmentDetailPageClient assessment={assessment} />;
}
