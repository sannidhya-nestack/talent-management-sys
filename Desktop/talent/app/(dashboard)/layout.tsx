/**
 * Dashboard Group Layout
 *
 * This layout wraps all protected routes (dashboard, candidates, users, settings).
 * It provides the consistent sidebar/header layout and authentication check.
 *
 * Access Control:
 * - Users must be authenticated via Firebase (Google OAuth)
 * - Users must have `hasAppAccess: true` custom claim OR `isAdmin: true` custom claim
 * - `hasAppAccess: true` = Hiring Managers (can view candidates)
 * - `isAdmin: true` = Administrators (full access including Users page)
 *
 * Routes using this layout:
 * - /dashboard
 * - /candidates
 * - /users (admin only)
 * - /settings
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/');
  }

  // Redirect to error page if user doesn't have app access
  // (doesn't have hasAppAccess or isAdmin custom claim)
  if (!session.user.hasAccess) {
    redirect('/auth/error?error=AccessDenied');
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    firstName: session.user.firstName,
    displayName: session.user.displayName,
    title: session.user.title,
    isAdmin: session.user.isAdmin,
  };

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
