/**
 * Forms API Route
 *
 * GET /api/forms - List all forms
 * POST /api/forms - Create a new form
 *
 * Required: Authenticated admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getForms, createForm, getFormStats } from '@/lib/services/forms';
import type { CreateFormData } from '@/types/form';

/**
 * GET /api/forms
 *
 * List all forms with pagination
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
    const includeTemplates = searchParams.get('includeTemplates') !== 'false';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    const [{ forms, total }, stats] = await Promise.all([
      getForms({ page, limit, includeTemplates, activeOnly }),
      includeStats ? getFormStats() : null,
    ]);

    return NextResponse.json({
      forms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/forms
 *
 * Create a new form
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
      return NextResponse.json({ error: 'Form name is required' }, { status: 400 });
    }

    if (!body.position || typeof body.position !== 'string') {
      return NextResponse.json({ error: 'Position is required' }, { status: 400 });
    }

    if (!Array.isArray(body.fields) || body.fields.length === 0) {
      return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
    }

    const createData: CreateFormData = {
      name: body.name,
      slug: body.slug,
      description: body.description,
      position: body.position,
      isActive: body.isActive ?? true,
      isTemplate: body.isTemplate ?? false,
      templateId: body.templateId,
      fields: body.fields,
      headerText: body.headerText,
      footerText: body.footerText,
      createdBy: session.user.dbUserId!,
    };

    const form = await createForm(createData);

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error('Error creating form:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
