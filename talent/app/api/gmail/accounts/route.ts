/**
 * Gmail Accounts Route
 *
 * GET /api/gmail/accounts
 *
 * Lists all connected Gmail accounts in the system.
 * Only accessible by admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllGmailAccounts, getConnectedGmailEmail } from '@/lib/gmail';

/**
 * GET /api/gmail/accounts
 *
 * Returns all connected Gmail accounts.
 * Admins see all accounts, non-admins only see their own.
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
    const isAdmin = session.user.isAdmin;

    if (!userId) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 400 }
      );
    }

    // Admins can see all connected accounts
    if (isAdmin) {
      const accounts = await getAllGmailAccounts();
      return NextResponse.json({
        accounts,
        isAdmin: true,
      });
    }

    // Non-admins only see their own connected email
    const email = await getConnectedGmailEmail(userId);
    return NextResponse.json({
      accounts: email
        ? [{
            id: 'current',
            email,
            userId,
            userName: session.user.name || 'You',
            connectedAt: new Date(),
          }]
        : [],
      isAdmin: false,
    });
  } catch (error) {
    console.error('[Gmail Accounts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gmail accounts' },
      { status: 500 }
    );
  }
}
