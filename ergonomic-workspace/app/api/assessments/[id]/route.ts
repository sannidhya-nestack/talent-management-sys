/**
 * Assessment Detail API Route
 *
 * GET /api/assessments/[id] - Get assessment by ID
 * PUT /api/assessments/[id] - Update assessment
 * DELETE /api/assessments/[id] - Delete assessment
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
} from '@/lib/services/assessments';
import { isValidUUID } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/assessments/[id]
 *
 * Get assessment by ID
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
        { error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    const assessment = await getAssessmentById(id);

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/assessments/[id]
 *
 * Update assessment
 */
export async function PUT(
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
        { error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const assessment = await updateAssessment(id, body);

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error('Error updating assessment:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/assessments/[id]
 *
 * Delete assessment
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

    // Validate ID is not empty
    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    await deleteAssessment(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
