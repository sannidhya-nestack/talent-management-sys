'use client';

/**
 * Firebase Email/Password Login Form
 *
 * Client-side component that handles Firebase authentication.
 * Uses Firebase Auth SDK to sign in users with email/password.
 * On success, sends the Firebase ID token to a server action
 * which creates the NextAuth session.
 */

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Mail, Lock } from 'lucide-react';

interface LoginFormProps {
  onSuccess: (idToken: string, email: string, uid: string) => Promise<void>;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate inputs
      if (!email.trim()) {
        throw new Error('Email is required');
      }
      if (!password) {
        throw new Error('Password is required');
      }

      // Get Firebase Auth instance
      const auth = getFirebaseAuth();

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Get the ID token
      const idToken = await user.getIdToken();

      // Call the success handler with token and user info
      await onSuccess(idToken, user.email || email, user.uid);
    } catch (err) {
      console.error('[LoginForm] Error:', err);
      
      // Handle Firebase Auth errors
      if (err instanceof Error) {
        const errorCode = (err as { code?: string }).code;
        
        switch (errorCode) {
          case 'auth/invalid-email':
            setError('Invalid email address format.');
            break;
          case 'auth/user-disabled':
            setError('This account has been disabled.');
            break;
          case 'auth/user-not-found':
            setError('No account found with this email.');
            break;
          case 'auth/wrong-password':
            setError('Incorrect password.');
            break;
          case 'auth/invalid-credential':
            setError('Invalid email or password.');
            break;
          case 'auth/too-many-requests':
            setError('Too many failed attempts. Please try again later.');
            break;
          case 'auth/network-request-failed':
            setError('Network error. Please check your connection.');
            break;
          default:
            setError(err.message || 'An error occurred during sign in.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="pl-10"
            autoComplete="email"
            autoFocus
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="pl-10"
            autoComplete="current-password"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  );
}
