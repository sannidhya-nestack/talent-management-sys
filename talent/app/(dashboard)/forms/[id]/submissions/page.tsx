/**
 * Form Submissions Page
 *
 * View submissions for a specific form.
 * Admin only.
 */

import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getFormById } from '@/lib/services/forms';
import { SubmissionsPageClient } from './page-client';

export const metadata = {
  title: 'Form Submissions',
};

interface SubmissionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionsPage({ params }: SubmissionsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  if (!session.user.isAdmin) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const form = await getFormById(id);

  if (!form) {
    notFound();
  }

  return <SubmissionsPageClient formId={form.id} formName={form.name} />;
}
