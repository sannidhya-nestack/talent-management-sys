/**
 * Activities API Route
 *
 * GET /api/activities - List activities
 * POST /api/activities - Create a new activity
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClientActivities, createActivity } from '@/lib/services/activities';
import { ActivityType } from '@/lib/types/firestore';
import type { CreateActivityData } from '@/lib/services/activities';

/**
 * GET /api/activities
 *
 * List activities
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
    const clientId = searchParams.get('clientId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const activities = await getClientActivities(clientId, limit);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/activities
 *
 * Create a new activity
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
    if (!body.clientId || !body.type || !body.description) {
      return NextResponse.json(
        { error: 'Client ID, type, and description are required' },
        { status: 400 }
      );
    }

    const activityData: CreateActivityData = {
      clientId: body.clientId,
      type: body.type as ActivityType,
      description: body.description,
      metadata: body.metadata,
      userId: body.userId || session.user.dbUserId,
    };

    const activity = await createActivity(activityData);

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
