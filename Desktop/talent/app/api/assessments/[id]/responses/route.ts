/**
 * Assessment Responses API Route
 *
 * GET /api/assessments/[id]/responses - List all sessions/responses for a template
 *
 * Required: Authenticated admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSessionsByTemplate, getSessionById } from '@/lib/services/assessment-sessions';
import { getTemplateById } from '@/lib/services/assessment-templates';
import type { SessionStatus } from '@/lib/generated/prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/assessments/[id]/responses
 *
 * List all sessions for a template with pagination
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Check if template exists
    const template = await getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') as SessionStatus | null;
    const sessionId = searchParams.get('sessionId');

    // If sessionId is provided, return the full session details
    if (sessionId) {
      const sessionDetails = await getSessionById(sessionId);

      if (!sessionDetails || sessionDetails.templateId !== id) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({ session: sessionDetails });
    }

    // Otherwise, list all sessions
    const { sessions, total } = await getSessionsByTemplate(id, {
      page,
      limit,
      status: status || undefined,
    });

    return NextResponse.json({
      sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching assessment responses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
