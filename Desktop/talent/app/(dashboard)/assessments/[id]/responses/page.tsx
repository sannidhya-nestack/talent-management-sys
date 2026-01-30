/**
 * Assessment Responses Page
 *
 * View all sessions/responses for a specific assessment template.
 * Admin only.
 */

import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/services/assessment-templates';
import { ResponsesPageClient } from './page-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Assessment Responses',
};

export default async function ResponsesPage({ params }: PageProps) {
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

  return <ResponsesPageClient template={template} />;
}
