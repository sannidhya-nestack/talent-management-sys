/**
 * Client Activity API Route
 *
 * GET /api/clients/[id]/activity
 *
 * Get activity feed for a client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClientActivities } from '@/lib/services/activities';
import { isValidUUID } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clients/[id]/activity
 *
 * Get activity feed for a client
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const activities = await getClientActivities(id, limit);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching client activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
