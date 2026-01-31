/**
 * Public Form Page
 *
 * Publicly accessible application form.
 * No authentication required.
 */

import { notFound } from 'next/navigation';
import { getFormBySlug } from '@/lib/services/forms';
import { PublicFormPageClient } from './page-client';
import { branding } from '@/config';

interface PublicFormPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PublicFormPageProps) {
  const { slug } = await params;
  const form = await getFormBySlug(slug);

  if (!form) {
    return { title: 'Form Not Found' };
  }

  return {
    title: `${form.name} | ${branding.appName}`,
    description: form.description || `Apply for ${form.position}`,
  };
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params;
  const form = await getFormBySlug(slug);

  if (!form) {
    notFound();
  }

  return <PublicFormPageClient form={form} />;
}
