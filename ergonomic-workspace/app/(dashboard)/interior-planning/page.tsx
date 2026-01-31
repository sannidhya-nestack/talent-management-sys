/**
 * Interior Planning Page
 *
 * Lists all interior planning layouts and projects.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InteriorPlanningPageClient } from './page-client';

export const metadata = {
  title: 'Interior Planning',
};

export default async function InteriorPlanningPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <InteriorPlanningPageClient />;
}
