/**
 * Authentication Error Page
 *
 * Displays error messages for authentication failures.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  let errorMessage = 'An authentication error occurred.';
  let errorTitle = 'Authentication Error';

  switch (error) {
    case 'AccessDenied':
      errorTitle = 'Access Denied';
      errorMessage = 'You do not have permission to access this application. Please contact your administrator.';
      break;
    case 'Configuration':
      errorTitle = 'Configuration Error';
      errorMessage = 'There is a problem with the server configuration.';
      break;
    case 'Verification':
      errorTitle = 'Verification Error';
      errorMessage = 'The verification token has expired or has already been used.';
      break;
    default:
      if (error) {
        errorTitle = 'Error';
        errorMessage = `An error occurred: ${error}`;
      }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">{errorTitle}</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button asChild variant="outline">
              <Link href="/">Return to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
