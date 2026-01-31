/**
 * Edit Form Page
 *
 * Edit an existing application form.
 * Admin only.
 */

import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getFormById } from '@/lib/services/forms';
import { EditFormPageClient } from './page-client';

export const metadata = {
  title: 'Edit Form',
};

interface EditFormPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFormPage({ params }: EditFormPageProps) {
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

  return <EditFormPageClient form={form} />;
}
