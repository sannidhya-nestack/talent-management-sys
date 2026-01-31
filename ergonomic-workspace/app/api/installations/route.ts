/**
 * Installations API Route
 *
 * GET /api/installations - List installations
 * POST /api/installations - Create a new installation
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getInstallations, createInstallation } from '@/lib/services/installations';
import { InstallationStatus } from '@/lib/types/firestore';
import type { CreateInstallationData } from '@/lib/services/installations';

/**
 * GET /api/installations
 *
 * List installations
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const clientId = searchParams.get('clientId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const status = searchParams.get('status') as InstallationStatus | null;

    const result = await getInstallations({
      page,
      limit,
      clientId,
      projectId,
      status: status || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching installations:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/installations
 *
 * Create a new installation
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.clientId || !body.scheduledDate) {
      return NextResponse.json(
        { error: 'Client ID and scheduled date are required' },
        { status: 400 }
      );
    }

    const installationData: CreateInstallationData = {
      clientId: body.clientId,
      projectId: body.projectId,
      scheduledDate: new Date(body.scheduledDate),
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
      teamMembers: body.teamMembers,
      notes: body.notes,
    };

    const installation = await createInstallation(installationData);

    return NextResponse.json({ installation }, { status: 201 });
  } catch (error) {
    console.error('Error creating installation:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
