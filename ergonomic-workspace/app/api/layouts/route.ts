/**
 * Layouts API Route
 *
 * GET /api/layouts - List layouts
 * POST /api/layouts - Create a new layout
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getLayouts, createLayout } from '@/lib/services/layouts';
import type { CreateLayoutData } from '@/lib/services/layouts';

/**
 * GET /api/layouts
 *
 * List layouts
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

    const result = await getLayouts({
      page,
      limit,
      clientId,
      projectId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/layouts
 *
 * Create a new layout
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
    if (!body.clientId || !body.name) {
      return NextResponse.json(
        { error: 'Client ID and name are required' },
        { status: 400 }
      );
    }

    const layoutData: CreateLayoutData = {
      clientId: body.clientId,
      projectId: body.projectId,
      name: body.name,
      description: body.description,
      floorPlanUrl: body.floorPlanUrl,
      layoutData: body.layoutData,
    };

    const layout = await createLayout(layoutData);

    return NextResponse.json({ layout }, { status: 201 });
  } catch (error) {
    console.error('Error creating layout:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
