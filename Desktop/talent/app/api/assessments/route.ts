/**
 * Assessments API Route
 *
 * GET /api/assessments - List all assessment templates
 * POST /api/assessments - Create a new assessment template
 *
 * Required: Authenticated admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTemplates,
  createTemplate,
  getTemplateStats,
  generateSlug,
  isSlugAvailable,
} from '@/lib/services/assessment-templates';
import type { AssessmentTemplateInput } from '@/types/assessment';
import type { AssessmentTemplateType } from '@/lib/generated/prisma/client';

/**
 * GET /api/assessments
 *
 * List all assessment templates with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') as AssessmentTemplateType | null;
    const position = searchParams.get('position') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const { templates, total } = await getTemplates({
      page,
      limit,
      type: type || undefined,
      position,
      activeOnly,
    });

    return NextResponse.json({
      templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching assessment templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/assessments
 *
 * Create a new assessment template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (!body.type || !['GENERAL_COMPETENCIES', 'SPECIALIZED_COMPETENCIES'].includes(body.type)) {
      return NextResponse.json({ error: 'Valid template type is required' }, { status: 400 });
    }

    if (body.passingScore === undefined || typeof body.passingScore !== 'number') {
      return NextResponse.json({ error: 'Passing score is required' }, { status: 400 });
    }

    if (!body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json({ error: 'At least one question is required' }, { status: 400 });
    }

    // Generate slug if not provided
    let slug = body.slug || generateSlug(body.name);

    // Ensure slug is available
    const slugAvailable = await isSlugAvailable(slug);
    if (!slugAvailable) {
      // Append a random suffix
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const templateData: AssessmentTemplateInput = {
      name: body.name,
      slug,
      description: body.description,
      type: body.type,
      position: body.position,
      isActive: body.isActive ?? true,
      passingScore: body.passingScore,
      maxScore: body.maxScore || 0, // Will be calculated from questions
      timeLimit: body.timeLimit,
      headerText: body.headerText,
      footerText: body.footerText,
      questions: body.questions,
    };

    if (!session.user.dbUserId) {
      return NextResponse.json({ error: 'User not synced to database' }, { status: 400 });
    }

    const template = await createTemplate(templateData, session.user.dbUserId);

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating assessment template:', error);

    if (error instanceof Error) {
      if (error.message === 'Slug is already in use') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === 'Invalid slug format') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
