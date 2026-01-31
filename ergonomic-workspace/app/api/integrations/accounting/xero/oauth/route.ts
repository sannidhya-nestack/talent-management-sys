/**
 * Xero OAuth Authorization Route
 *
 * GET /api/integrations/accounting/xero/oauth
 *
 * Initiates OAuth flow for Xero integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAuthUrl } from '@/lib/services/accounting/xero';
import { randomBytes } from 'crypto';

/**
 * GET /api/integrations/accounting/xero/oauth
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

    if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Xero OAuth is not configured' },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    const stateData = {
      userId: session.user.dbUserId,
      provider: 'xero',
      nonce: randomBytes(16).toString('hex'),
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    const authUrl = generateAuthUrl(state);

    const response = NextResponse.json({
      authUrl,
      state,
      provider: 'xero',
    });

    // Set state in cookie for verification
    response.cookies.set('accounting_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error generating Xero OAuth URL:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
