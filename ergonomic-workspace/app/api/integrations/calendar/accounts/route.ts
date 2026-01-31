/**
 * Calendar Accounts API Route
 *
 * GET /api/integrations/calendar/accounts - Get connected calendar accounts
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserCalendarAccounts } from '@/lib/services/integrations/calendar';

/**
 * GET /api/integrations/calendar/accounts
 *
 * Get connected calendar accounts for the current user
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

    const accounts = await getUserCalendarAccounts(session.user.dbUserId);

    return NextResponse.json({
      accounts: accounts.map((acc) => ({
        id: acc.id,
        provider: acc.provider,
        email: acc.email,
      })),
    });
  } catch (error) {
    console.error('Error fetching calendar accounts:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
