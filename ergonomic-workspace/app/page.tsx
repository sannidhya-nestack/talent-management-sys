/**
 * Home Page / Login Page
 *
 * This is the landing page that handles authentication:
 * - If logged in: redirects to dashboard
 * - If not logged in: shows email/password sign in form
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { branding, strings } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { LoginPageClient } from './page-client';

export default async function Home() {
  const session = await auth();

  // If user is already logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  // Check if Firebase is configured
  const isFirebaseConfigured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{branding.appName}</CardTitle>
          <CardDescription>{branding.organisationShortName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            {strings.dashboard.welcome} to the ergonomic workspace management platform.
          </p>

          {!isFirebaseConfigured ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-red-900 dark:text-red-100">
                    Firebase Not Configured
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Firebase credentials are not set. Please configure:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-red-700 dark:text-red-300">
                    <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
                    <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
                    <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <LoginPageClient />
          )}

          <p className="text-center text-xs text-muted-foreground">
            {strings.login.subtitle}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
