/**
 * Start Assessment API Route
 *
 * POST /api/assess/[slug]/start - Start an assessment session
 *
 * This is a public route but requires person identification via query params.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTemplateBySlug, getPublicQuestions } from '@/lib/services/assessment-templates';
import { startSession, getExistingResponses } from '@/lib/services/assessment-sessions';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/assess/[slug]/start
 *
 * Start a new assessment session or resume existing one
 * 
 * Body:
 * - personId: string (required)
 * - applicationId?: string (for SC assessments)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const headersList = await headers();

    // Validate person ID
    const personId = body.personId;
    if (!personId) {
      return NextResponse.json({ error: 'Person ID is required' }, { status: 400 });
    }

    // Verify person exists
    const person = await db.person.findUnique({
      where: { id: personId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!person) {
      return NextResponse.json({ error: 'Invalid person ID' }, { status: 400 });
    }

    // Get template
    const template = await getTemplateBySlug(slug);
    if (!template) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!template.isActive) {
      return NextResponse.json({ error: 'Assessment is not currently available' }, { status: 400 });
    }

    // For SC assessments, verify application ID
    const applicationId = body.applicationId;
    if (template.type === 'SPECIALIZED_COMPETENCIES') {
      if (!applicationId) {
        return NextResponse.json({ error: 'Application ID is required for specialized assessments' }, { status: 400 });
      }

      // Verify application belongs to person
      const application = await db.application.findUnique({
        where: { id: applicationId },
        select: { personId: true },
      });

      if (!application || application.personId !== personId) {
        return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
      }
    }

    // Get client info
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    // Start or resume session
    const { sessionId, expiresAt } = await startSession({
      templateId: template.id,
      personId,
      applicationId,
      ipAddress: ipAddress || undefined,
      userAgent,
    });

    // Get questions for the assessment
    const questions = await getPublicQuestions(template.id);

    // Get any existing responses (for resuming)
    const existingResponses = await getExistingResponses(sessionId);

    return NextResponse.json({
      session: {
        id: sessionId,
        startedAt: new Date(),
        expiresAt,
      },
      template: {
        id: template.id,
        name: template.name,
        slug: template.slug,
        description: template.description,
        type: template.type,
        position: template.position,
        timeLimit: template.timeLimit,
        headerText: template.headerText,
        footerText: template.footerText,
        questionsCount: template.questions.length,
      },
      questions,
      existingResponses,
      person: {
        firstName: person.firstName,
        lastName: person.lastName,
      },
    });
  } catch (error) {
    console.error('Error starting assessment:', error);

    if (error instanceof Error) {
      if (error.message === 'You have already completed this assessment') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === 'Assessment is not currently active') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
