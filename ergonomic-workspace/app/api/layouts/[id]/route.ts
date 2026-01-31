/**
 * Layout Detail API Route
 *
 * GET /api/layouts/[id] - Get layout by ID
 * PUT /api/layouts/[id] - Update layout
 * DELETE /api/layouts/[id] - Delete layout
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getLayoutById, updateLayout, deleteLayout } from '@/lib/services/layouts';
import { isValidUUID } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }

    const layout = await getLayoutById(id);
    if (!layout) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    return NextResponse.json({ layout });
  } catch (error) {
    console.error('Error fetching layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }

    const body = await request.json();
    const layout = await updateLayout(id, body);

    return NextResponse.json({ layout });
  } catch (error) {
    console.error('Error updating layout:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }

    await deleteLayout(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting layout:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
