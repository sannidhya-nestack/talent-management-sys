/**
 * Financial Reports API Route
 *
 * GET /api/reports/financial - Generate financial report
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateFinancialReport } from '@/lib/services/reports/financial';

/**
 * GET /api/reports/financial
 *
 * Generate financial report
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
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const clientId = searchParams.get('clientId') || undefined;

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const report = await generateFinancialReport({
      startDate,
      endDate,
      clientId,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating financial report:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
