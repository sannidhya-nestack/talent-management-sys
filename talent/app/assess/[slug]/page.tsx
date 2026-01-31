/**
 * Public Assessment Page
 *
 * Candidates take assessments here.
 * URL format: /assess/[slug]?who=[personId]&app=[applicationId]
 */

import { notFound } from 'next/navigation';
import { getPublicTemplate } from '@/lib/services/assessment-templates';
import { AssessmentPageClient } from './page-client';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ who?: string; app?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const template = await getPublicTemplate(slug);

  if (!template) {
    return { title: 'Assessment Not Found' };
  }

  return {
    title: template.name,
    description: template.description || `Take the ${template.name} assessment`,
  };
}

export default async function AssessmentPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { who: personId, app: applicationId } = await searchParams;

  const template = await getPublicTemplate(slug);

  if (!template) {
    notFound();
  }

  return (
    <AssessmentPageClient
      template={template}
      slug={slug}
      personId={personId}
      applicationId={applicationId}
    />
  );
}
