/**
 * Installation Detail API Route
 *
 * GET /api/installations/[id] - Get installation by ID
 * PUT /api/installations/[id] - Update installation
 * DELETE /api/installations/[id] - Delete installation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getInstallationById, updateInstallation, deleteInstallation } from '@/lib/services/installations';
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
      return NextResponse.json({ error: 'Invalid installation ID' }, { status: 400 });
    }

    const installation = await getInstallationById(id);
    if (!installation) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }

    return NextResponse.json({ installation });
  } catch (error) {
    console.error('Error fetching installation:', error);
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
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid installation ID' }, { status: 400 });
    }

    const body = await request.json();
    const installation = await updateInstallation(id, body);

    return NextResponse.json({ installation });
  } catch (error) {
    console.error('Error updating installation:', error);
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
      return NextResponse.json({ error: 'Invalid installation ID' }, { status: 400 });
    }

    await deleteInstallation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting installation:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
