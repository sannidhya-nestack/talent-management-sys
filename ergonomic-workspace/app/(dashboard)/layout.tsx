/**
 * Dashboard Group Layout
 *
 * This layout wraps all protected routes (dashboard, clients, assessments, etc.).
 * It provides the consistent sidebar/header layout and authentication check.
 *
 * Access Control:
 * - Users must be authenticated via Firebase
 * - Users must have `hasAppAccess: true` or `isAdmin: true` in database
 *
 * Routes using this layout:
 * - /dashboard
 * - /clients
 * - /assessments
 * - /questionnaires
 * - /interior-planning
 * - /installations
 * - /integrations
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
  let session;
  try {
    session = await auth();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error checking authentication:', errorMessage);
    
    // If Firebase Admin isn't configured, redirect to home with error message
    if (errorMessage.includes('FIREBASE_ADMIN') || 
        errorMessage.includes('Missing required Firebase') ||
        errorMessage.includes('DECODER')) {
      console.error(
        '\n⚠️  Firebase Admin is not properly configured.\n' +
        'Please check your .env file and ensure FIREBASE_ADMIN_PRIVATE_KEY, ' +
        'FIREBASE_ADMIN_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set correctly.\n' +
        'See FIREBASE_SETUP.md for detailed instructions.\n'
      );
      // Redirect to home page - it will show Firebase config error
      redirect('/');
    }
    
    // For other errors, redirect to home
    redirect('/');
  }

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/');
  }

  // Redirect to error page if user doesn't have app access
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
