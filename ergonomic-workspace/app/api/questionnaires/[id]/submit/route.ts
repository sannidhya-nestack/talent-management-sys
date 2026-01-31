/**
 * Questionnaire Submit API Route
 *
 * POST /api/questionnaires/[id]/submit
 *
 * Submit questionnaire responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { collections, generateId } from '@/lib/db';
import { serverTimestamp } from '@/lib/db-utils';
import { getQuestionnaireById } from '@/lib/services/questionnaires';
import { isValidUUID } from '@/lib/utils';
import type { ResponseSubmission } from '@/types/questionnaire';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/questionnaires/[id]/submit
 *
 * Submit questionnaire responses
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Get questionnaire template
    const template = await getQuestionnaireById(id);
    if (!template) {
      return NextResponse.json(
        { error: 'Questionnaire not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { responses } = body as { responses: ResponseSubmission[] };

    if (!Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Invalid responses format' },
        { status: 400 }
      );
    }

    // Save responses to Firestore
    for (const response of responses) {
      const responseId = generateId();
      await collections.questionnaireResponses().doc(responseId).set({
        id: responseId,
        questionnaireId: template.id, // This should be a questionnaire instance ID in full implementation
        questionId: response.questionId,
        answer: response.answer,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
