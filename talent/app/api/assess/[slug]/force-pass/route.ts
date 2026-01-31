/**
 * Force Pass Assessment API Route (DEBUG)
 *
 * POST /api/assess/[slug]/force-pass - Force an assessment to pass regardless of score
 *
 * This is a DEBUG route for testing purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleGCCompletion, handleSCCompletion } from '@/lib/services/assessment-sessions';
import { getTemplateBySlug } from '@/lib/services/assessment-templates';
import { recruitment } from '@/config/recruitment';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/assess/[slug]/force-pass
 *
 * Force an assessment session to pass
 *
 * Body:
 * - sessionId: string (required)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get session
    const session = await db.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        template: true,
        person: {
          select: {
            id: true,
            email: true,
          },
        },
        application: {
          select: {
            id: true,
            position: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get template to get passing score and max score
    const template = await getTemplateBySlug(slug);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Calculate max score from questions
    const maxScore = template.questions.reduce((sum, q) => sum + q.points, 0);

    // Force pass: set raw score to max score
    const forcedRawScore = maxScore;
    
    // Calculate normalized score for pipeline updates
    // GC uses 0-1000 scale, SC uses 0-600 scale
    let normalizedScore: number;
    if (template.type === 'GENERAL_COMPETENCIES') {
      normalizedScore = recruitment.assessmentThresholds.generalCompetencies.scale; // 1000
    } else {
      normalizedScore = recruitment.assessmentThresholds.specializedCompetencies.scale; // 600
    }

    // Update session to passed (store raw score for display)
    await db.assessmentSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        score: forcedRawScore, // Raw score for UI display
        passed: true,
        completedAt: new Date(),
      },
    });

    // Handle pipeline updates based on assessment type - use normalized scores
    if (template.type === 'GENERAL_COMPETENCIES') {
      await handleGCCompletion(
        session.personId,
        normalizedScore, // 1000 (max normalized score)
        true // passed
      );
    } else if (template.type === 'SPECIALIZED_COMPETENCIES' && session.applicationId) {
      await handleSCCompletion(
        session.applicationId,
        session.personId,
        normalizedScore, // 600 (max normalized score)
        true, // passed
        template.id
      );
    }

    // Return updated result
    const percentage = Math.round((forcedRawScore / maxScore) * 100);

    return NextResponse.json({
      success: true,
      result: {
        rawScore: forcedRawScore,
        maxScore,
        normalizedScore,
        percentage,
        passingScore: template.passingScore,
        passed: true,
      },
    });
  } catch (error) {
    console.error('Error forcing pass:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
