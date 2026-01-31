/**
 * Assessments API Route
 *
 * GET /api/assessments - List assessments
 * POST /api/assessments - Create a new assessment
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAssessments, createAssessment } from '@/lib/services/assessments';
import { AssessmentStatus, AssessmentType } from '@/lib/types/firestore';
import type { CreateAssessmentData } from '@/lib/services/assessments';

/**
 * GET /api/assessments
 *
 * List assessments
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
    const clientId = searchParams.get('clientId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const status = searchParams.get('status') as AssessmentStatus | null;
    const type = searchParams.get('type') as AssessmentType | null;

    const result = await getAssessments({
      page,
      limit,
      clientId,
      projectId,
      status: status || undefined,
      type: type || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assessments
 *
 * Create a new assessment
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

    const body = await request.json();

    // Validate required fields
    if (!body.clientId || !body.type) {
      return NextResponse.json(
        { error: 'Client ID and type are required' },
        { status: 400 }
      );
    }

    const assessmentData: CreateAssessmentData = {
      clientId: body.clientId,
      projectId: body.projectId,
      type: body.type,
      status: body.status,
      conductedDate: body.conductedDate ? new Date(body.conductedDate) : undefined,
      notes: body.notes,
      conductedBy: body.conductedBy || session.user.dbUserId || undefined,
    };

    const assessment = await createAssessment(assessmentData);

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Error creating assessment:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
