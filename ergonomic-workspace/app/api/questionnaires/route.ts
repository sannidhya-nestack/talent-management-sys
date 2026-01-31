/**
 * Questionnaires API Route
 *
 * GET /api/questionnaires - List questionnaire templates
 * POST /api/questionnaires - Create a new questionnaire template
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getQuestionnaires,
  createQuestionnaire,
} from '@/lib/services/questionnaires';
import type { QuestionnaireInput } from '@/types/questionnaire';

/**
 * GET /api/questionnaires
 *
 * List questionnaire templates
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const result = await getQuestionnaires({
      page,
      limit,
      activeOnly,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching questionnaires:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/questionnaires
 *
 * Create a new questionnaire template
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as QuestionnaireInput;

    // Validate required fields
    if (!body.name || !body.questions || !Array.isArray(body.questions)) {
      return NextResponse.json(
        { error: 'Name and questions are required' },
        { status: 400 }
      );
    }

    // Generate slug from name if not provided
    if (!body.slug) {
      const { generateSlug } = await import('@/lib/services/questionnaires');
      body.slug = generateSlug(body.name);
    }

    const questionnaire = await createQuestionnaire(
      body,
      session.user.dbUserId
    );

    return NextResponse.json({ questionnaire }, { status: 201 });
  } catch (error) {
    console.error('Error creating questionnaire:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
