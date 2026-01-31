/**
 * Email Accounts API Route
 *
 * GET /api/integrations/email/accounts - Get connected email accounts
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserEmailAccounts } from '@/lib/services/integrations/email';

/**
 * GET /api/integrations/email/accounts
 *
 * Get connected email accounts for the current user
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

    const accounts = await getUserEmailAccounts(session.user.dbUserId);

    return NextResponse.json({
      accounts: accounts.map((acc) => ({
        email: acc.email,
        provider: acc.provider,
      })),
    });
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
