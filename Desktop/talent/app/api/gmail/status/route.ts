/**
 * Gmail Status Route
 *
 * GET /api/gmail/status
 *
 * Returns the current user's Gmail connection status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getConnectedGmailEmail, isGmailOAuthConfigured } from '@/lib/gmail';

/**
 * GET /api/gmail/status
 *
 * Returns whether the current user has Gmail connected and the connected email.
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

    const userId = session.user.dbUserId;
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 400 }
      );
    }

    // Check if Gmail OAuth is configured at all
    const isConfigured = isGmailOAuthConfigured();

    // Get connected email if any
    const connectedEmail = await getConnectedGmailEmail(userId);

    return NextResponse.json({
      configured: isConfigured,
      connected: !!connectedEmail,
      email: connectedEmail,
    });
  } catch (error) {
    console.error('[Gmail Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gmail status' },
      { status: 500 }
    );
  }
}
