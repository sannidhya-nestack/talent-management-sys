/**
 * Single Form API Route
 *
 * GET /api/forms/[id] - Get a form by ID
 * PUT /api/forms/[id] - Update a form
 * DELETE /api/forms/[id] - Delete a form
 *
 * Required: Authenticated admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getFormById,
  updateForm,
  deleteForm,
  duplicateForm,
  toggleFormActive,
} from '@/lib/services/forms';
import type { UpdateFormData } from '@/types/form';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/forms/[id]
 *
 * Get a form by ID
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
    const form = await getFormById(id);

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/forms/[id]
 *
 * Update a form
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if form exists
    const existingForm = await getFormById(id);
    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Handle special actions
    if (body.action === 'duplicate') {
      const duplicatedForm = await duplicateForm(id, session.user.dbUserId!);
      return NextResponse.json({ form: duplicatedForm });
    }

    if (body.action === 'toggleActive') {
      const updatedForm = await toggleFormActive(id);
      return NextResponse.json({ form: updatedForm });
    }

    // Regular update
    const updateData: UpdateFormData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isTemplate !== undefined) updateData.isTemplate = body.isTemplate;
    if (body.fields !== undefined) updateData.fields = body.fields;
    if (body.headerText !== undefined) updateData.headerText = body.headerText;
    if (body.footerText !== undefined) updateData.footerText = body.footerText;

    const form = await updateForm(id, updateData);

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Error updating form:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/forms/[id]
 *
 * Delete a form
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Check if form exists
    const existingForm = await getFormById(id);
    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    await deleteForm(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
