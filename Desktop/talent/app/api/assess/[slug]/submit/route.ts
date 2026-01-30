/**
 * Submit Assessment API Route
 *
 * POST /api/assess/[slug]/submit - Submit assessment responses and get score
 *
 * This is a public route but requires a valid session ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitAssessment, saveResponse } from '@/lib/services/assessment-sessions';
import type { ResponseSubmission, AnswerData } from '@/types/assessment';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/assess/[slug]/submit
 *
 * Submit assessment and get results
 *
 * Body:
 * - sessionId: string (required)
 * - responses: ResponseSubmission[] (required)
 * - action?: 'save' | 'submit' (default: 'submit')
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();

    // Validate session ID
    const sessionId = body.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Validate responses
    const responses: ResponseSubmission[] = body.responses;
    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Responses are required' }, { status: 400 });
    }

    // Check action type
    const action = body.action || 'submit';

    // Auto-save single response
    if (action === 'save' && responses.length === 1) {
      const response = responses[0];

      await saveResponse({
        sessionId,
        questionId: response.questionId,
        answer: response.answer,
      });

      return NextResponse.json({ success: true });
    }

    // Full submission
    const result = await submitAssessment({
      sessionId,
      responses,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);

    if (error instanceof Error) {
      if (error.message === 'Session not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === 'Session is not active') {
        return NextResponse.json({ error: 'This assessment session has already been submitted or expired' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
