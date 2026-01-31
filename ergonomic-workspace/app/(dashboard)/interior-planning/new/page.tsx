/**
 * New Layout Page
 *
 * Create a new interior planning layout.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewLayoutPageClient } from './page-client';

export const metadata = {
  title: 'Create Layout',
};

export default async function NewLayoutPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <NewLayoutPageClient />;
}
