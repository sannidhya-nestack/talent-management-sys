/**
 * Email OAuth Authorization Route
 *
 * GET /api/integrations/email/oauth?provider=gmail|outlook
 *
 * Initiates OAuth flow for email integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAuthUrl } from '@/lib/email/gmail/client';
import { isGmailOAuthConfigured } from '@/lib/email/gmail/config';
import { randomBytes } from 'crypto';

/**
 * GET /api/integrations/email/oauth
 *
 * Returns OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');

    if (provider !== 'gmail' && provider !== 'outlook') {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "gmail" or "outlook"' },
        { status: 400 }
      );
    }

    if (provider === 'gmail') {
      if (!isGmailOAuthConfigured()) {
        return NextResponse.json(
          { error: 'Gmail OAuth is not configured' },
          { status: 500 }
        );
      }

      // Generate state parameter for CSRF protection
      const stateData = {
        userId: session.user.dbUserId,
        provider: 'gmail',
        nonce: randomBytes(16).toString('hex'),
        timestamp: Date.now(),
      };
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      const authUrl = generateAuthUrl(state);

      const response = NextResponse.json({
        authUrl,
        state,
        provider: 'gmail',
      });

      // Set state in cookie for verification
      response.cookies.set('email_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });

      return response;
    }

    // Outlook OAuth (to be implemented)
    return NextResponse.json(
      { error: 'Outlook OAuth not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
