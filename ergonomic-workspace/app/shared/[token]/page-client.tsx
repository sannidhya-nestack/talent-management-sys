'use client';

/**
 * Shared Document View Client Component
 */

import * as React from 'react';
import { Download, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifySharePassword } from '@/lib/services/documents/sharing';

interface SharedDocumentViewProps {
  document: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: string;
  };
  share: {
    id: string;
    token: string;
    passwordHash: string | null;
    expiresAt: Date | null;
  };
}

export function SharedDocumentView({ document, share }: SharedDocumentViewProps) {
  const [password, setPassword] = React.useState('');
  const [isAuthenticated, setIsAuthenticated] = React.useState(!share.passwordHash);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch(`/api/shared/${share.token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid password');
      }

      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Password Required</CardTitle>
            </div>
            <CardDescription>
              This document is password protected. Please enter the password to access it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isVerifying}
                required
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isVerifying} className="w-full">
                {isVerifying ? 'Verifying...' : 'Access Document'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{document.fileName}</CardTitle>
          <CardDescription>
            Shared document • {document.fileType} • {(document.fileSize / 1024).toFixed(2)} KB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button asChild>
              <a href={document.fileUrl} download={document.fileName} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
            {document.fileType === 'application/pdf' && (
              <Button variant="outline" asChild>
                <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                  View in Browser
                </a>
              </Button>
            )}
          </div>
          {share.expiresAt && (
            <p className="text-sm text-muted-foreground">
              This link expires on {share.expiresAt.toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
