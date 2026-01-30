'use client';

/**
 * Login Page Client Component
 *
 * Handles the client-side login form and navigation after successful authentication.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { signInWithFirebaseToken } from './actions';

export function LoginPageClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleLoginSuccess = async (idToken: string, email: string, uid: string) => {
    setError(null);

    try {
      // Call server action to create NextAuth session
      const result = await signInWithFirebaseToken(idToken, email, uid);

      if (!result.success) {
        setError(result.error || 'Failed to create session');
        return;
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('[LoginPageClient] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
}
