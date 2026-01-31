/**
 * Client Communications API Route
 *
 * GET /api/clients/[id]/communications - Get communications for a client
 * POST /api/clients/[id]/communications - Create a new communication
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClientCommunications, createCommunication } from '@/lib/services/communications';
import { logCommunicationActivity } from '@/lib/services/activities';
import { isValidUUID } from '@/lib/utils';
import { CommunicationType } from '@/lib/types/firestore';
import type { CreateCommunicationData } from '@/lib/services/communications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clients/[id]/communications
 *
 * Get communications for a client
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

    const communications = await getClientCommunications(id, limit);

    return NextResponse.json({ communications });
  } catch (error) {
    console.error('Error fetching client communications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients/[id]/communications
 *
 * Create a new communication
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.date) {
      return NextResponse.json(
        { error: 'Type and date are required' },
        { status: 400 }
      );
    }

    const communicationData: CreateCommunicationData = {
      clientId: id,
      type: body.type as CommunicationType,
      subject: body.subject,
      participants: body.participants,
      notes: body.notes,
      date: new Date(body.date),
      duration: body.duration,
      attachments: body.attachments,
      userId: session.user.dbUserId,
    };

    const communication = await createCommunication(communicationData);

    // Log activity
    await logCommunicationActivity(
      id,
      session.user.dbUserId,
      body.type,
      body.subject
    );

    return NextResponse.json({ communication }, { status: 201 });
  } catch (error) {
    console.error('Error creating communication:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
