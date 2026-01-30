/**
 * Assessment Templates for Email Selection API
 *
 * GET /api/assessments/for-email
 *
 * Returns active assessment templates for selection when sending invitation emails.
 * Query params:
 * - type: 'GENERAL_COMPETENCIES' | 'SPECIALIZED_COMPETENCIES'
 * - position: Optional position filter for SC templates
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTemplatesForEmail } from '@/lib/services/assessment-templates';
import type { AssessmentTemplateType } from '@/lib/generated/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.hasAccess) {
      return NextResponse.json({ error: 'App access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as AssessmentTemplateType;
    const position = searchParams.get('position') || undefined;

    if (!type || !['GENERAL_COMPETENCIES', 'SPECIALIZED_COMPETENCIES'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type parameter required (GENERAL_COMPETENCIES or SPECIALIZED_COMPETENCIES)' },
        { status: 400 }
      );
    }

    const templates = await getTemplatesForEmail({ type, position });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching assessment templates for email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
