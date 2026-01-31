/**
 * Gmail OAuth Connect Route
 *
 * GET /api/email/gmail/connect
 *
 * Initiates Gmail OAuth2 flow by redirecting to Google authorization page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAuthUrl } from '@/lib/email/gmail';

/**
 * GET /api/email/gmail/connect
 *
 * Generate OAuth URL and redirect user to Google
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate state with user ID and nonce for CSRF protection
    const stateData = {
      userId: session.user.dbUserId,
      nonce: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Generate authorization URL
    const authUrl = generateAuthUrl(state);

    // Set state cookie for verification in callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('gmail_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('[Gmail Connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail connection' },
      { status: 500 }
    );
  }
}
