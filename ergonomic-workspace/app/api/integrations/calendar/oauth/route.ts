/**
 * Calendar OAuth Authorization Route
 *
 * GET /api/integrations/calendar/oauth?provider=google|outlook
 *
 * Initiates OAuth flow for calendar integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAuthUrl } from '@/lib/services/calendar/google';
import { randomBytes } from 'crypto';

/**
 * GET /api/integrations/calendar/oauth
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

    if (provider !== 'google' && provider !== 'outlook') {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "outlook"' },
        { status: 400 }
      );
    }

    if (provider === 'google') {
      // Generate state parameter for CSRF protection
      const stateData = {
        userId: session.user.dbUserId,
        provider: 'google',
        nonce: randomBytes(16).toString('hex'),
        timestamp: Date.now(),
      };
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      const authUrl = generateAuthUrl(state);

      const response = NextResponse.json({
        authUrl,
        state,
        provider: 'google',
      });

      // Set state in cookie for verification
      response.cookies.set('calendar_oauth_state', state, {
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
      { error: 'Outlook Calendar OAuth not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error generating calendar OAuth URL:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
