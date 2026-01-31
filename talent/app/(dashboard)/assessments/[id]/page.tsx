/**
 * Edit Assessment Page
 *
 * Edit an existing assessment template.
 * Admin only.
 */

import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/services/assessment-templates';
import { EditAssessmentPageClient } from './page-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Edit Assessment',
};

export default async function EditAssessmentPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  if (!session.user.isAdmin) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const template = await getTemplateById(id);

  if (!template) {
    notFound();
  }

  return <EditAssessmentPageClient template={template} />;
}
