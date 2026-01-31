/**
 * Email OAuth Callback Route
 *
 * GET /api/integrations/email/callback
 *
 * Handles OAuth callback from email providers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exchangeCodeForTokens, encryptToken } from '@/lib/email/gmail/client';
import { upsertEmailAccount } from '@/lib/services/integrations/email';

/**
 * GET /api/integrations/email/callback
 *
 * OAuth callback endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('[Email OAuth] Error:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?error=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?error=missing_params`
      );
    }

    // Verify state
    const storedState = request.cookies.get('email_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?error=invalid_state`
      );
    }

    // Parse state
    let stateData: { userId: string; provider: string; nonce: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?error=invalid_state_format`
      );
    }

    // Check state timestamp
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?error=expired`
      );
    }

    // Verify user is still authenticated
    const session = await auth();
    if (!session?.user || session.user.dbUserId !== stateData.userId) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?error=unauthorized`
      );
    }

    // Handle Gmail
    if (stateData.provider === 'gmail') {
      const tokens = await exchangeCodeForTokens(code);

      // Encrypt tokens
      const encryptedAccessToken = encryptToken(tokens.accessToken);
      const encryptedRefreshToken = encryptToken(tokens.refreshToken);

      // Save credentials
      await upsertEmailAccount({
        userId: session.user.dbUserId,
        provider: 'GMAIL',
        email: tokens.email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiryDate,
        scopes: 'https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/userinfo.email',
      });

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?success=gmail_connected`
      );
    }

    // Outlook (to be implemented)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?error=provider_not_supported`
    );
  } catch (error) {
    console.error('Error in email OAuth callback:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/integrations/email?error=${encodeURIComponent(message)}`
    );
  }
}
