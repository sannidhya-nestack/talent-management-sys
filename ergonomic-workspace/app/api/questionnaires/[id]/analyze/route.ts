/**
 * Questionnaire Analysis API Route
 *
 * POST /api/questionnaires/[id]/analyze - Analyze questionnaire responses using AI
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeQuestionnaireResponses } from '@/lib/services/questionnaires/analysis';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/questionnaires/[id]/analyze
 *
 * Analyze questionnaire responses
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

    const analysis = await analyzeQuestionnaireResponses(id, session.user.dbUserId);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing questionnaire:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
