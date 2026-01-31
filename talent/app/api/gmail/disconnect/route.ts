/**
 * Gmail Disconnect Route
 *
 * POST /api/gmail/disconnect
 *
 * Disconnects the user's Gmail account by revoking tokens and deleting credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { disconnectGmail, hasGmailConnected } from '@/lib/gmail';

/**
 * POST /api/gmail/disconnect
 *
 * Disconnects the current user's Gmail account.
 */
export async function POST(request: NextRequest) {
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

    // Check if user has Gmail connected
    const hasGmail = await hasGmailConnected(userId);
    if (!hasGmail) {
      return NextResponse.json(
        { error: 'No Gmail account connected' },
        { status: 400 }
      );
    }

    // Disconnect Gmail
    await disconnectGmail(userId);

    console.log(`[Gmail] Disconnected Gmail for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Gmail disconnected successfully',
    });
  } catch (error) {
    console.error('[Gmail Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail' },
      { status: 500 }
    );
  }
}
