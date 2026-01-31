/**
 * Assessment Report API Route
 *
 * POST /api/assessments/[id]/report - Generate assessment report using AI
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAssessmentReport } from '@/lib/services/assessments/reports';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/assessments/[id]/report
 *
 * Generate assessment report
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const report = await generateAssessmentReport(id, session.user.dbUserId);

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating assessment report:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
