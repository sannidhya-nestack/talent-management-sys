/**
 * Gmail OAuth Authorize Route
 *
 * GET /api/gmail/authorize
 *
 * Initiates the Gmail OAuth2 flow by redirecting to Google's consent screen.
 * Returns a URL that should be opened in a popup window.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAuthUrl, isGmailOAuthConfigured } from '@/lib/gmail';
import { randomBytes } from 'crypto';

/**
 * GET /api/gmail/authorize
 *
 * Returns the OAuth authorization URL for Gmail.
 * The frontend should open this URL in a popup window.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Gmail OAuth is configured
    if (!isGmailOAuthConfigured()) {
      return NextResponse.json(
        { error: 'Gmail OAuth is not configured. Please set GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET.' },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    // Include user ID to verify on callback
    const stateData = {
      userId: session.user.dbUserId,
      nonce: randomBytes(16).toString('hex'),
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Store state in a cookie for verification on callback
    const authUrl = generateAuthUrl(state);

    // Return the authorization URL
    const response = NextResponse.json({
      authUrl,
      state,
    });

    // Set state in cookie for verification (expires in 10 minutes)
    response.cookies.set('gmail_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Gmail Auth] Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail authorization' },
      { status: 500 }
    );
  }
}
