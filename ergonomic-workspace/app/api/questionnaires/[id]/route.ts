/**
 * Questionnaire Detail API Route
 *
 * GET /api/questionnaires/[id] - Get questionnaire template by ID
 * PUT /api/questionnaires/[id] - Update questionnaire template
 * DELETE /api/questionnaires/[id] - Delete questionnaire template
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getQuestionnaireById,
  updateQuestionnaire,
  deleteQuestionnaire,
  toggleQuestionnaireActive,
} from '@/lib/services/questionnaires';
import { isValidUUID } from '@/lib/utils';
import type { QuestionnaireInput } from '@/types/questionnaire';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/questionnaires/[id]
 *
 * Get questionnaire template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate ID is not empty
    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid questionnaire ID' },
        { status: 400 }
      );
    }

    const questionnaire = await getQuestionnaireById(id);

    if (!questionnaire) {
      return NextResponse.json(
        { error: 'Questionnaire not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ questionnaire });
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/questionnaires/[id]
 *
 * Update questionnaire template
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid questionnaire ID' },
        { status: 400 }
      );
    }

    const body = await request.json() as Partial<QuestionnaireInput>;

    // Check if this is a toggle active request
    if (body.isActive !== undefined && Object.keys(body).length === 1) {
      const questionnaire = await toggleQuestionnaireActive(id);
      return NextResponse.json({ questionnaire });
    }

    const questionnaire = await updateQuestionnaire(id, body);

    return NextResponse.json({ questionnaire });
  } catch (error) {
    console.error('Error updating questionnaire:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/questionnaires/[id]
 *
 * Delete questionnaire template
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid questionnaire ID' },
        { status: 400 }
      );
    }

    await deleteQuestionnaire(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting questionnaire:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
