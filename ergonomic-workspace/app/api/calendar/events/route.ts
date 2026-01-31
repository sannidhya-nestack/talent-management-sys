/**
 * Calendar Events API Route
 *
 * POST /api/calendar/events - Create a calendar event
 * GET /api/calendar/events - List calendar events
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createCalendarEvent, getCalendarEvents } from '@/lib/services/calendar/google';

/**
 * POST /api/calendar/events
 *
 * Create a calendar event
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { summary, description, start, end, location, attendees } = body;

    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields: summary, start, end' },
        { status: 400 }
      );
    }

    const event = await createCalendarEvent(session.user.dbUserId, {
      summary,
      description,
      start,
      end,
      location,
      attendees,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/events
 *
 * List calendar events
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax');
    const maxResults = parseInt(searchParams.get('maxResults') || '100', 10);

    const events = await getCalendarEvents(session.user.dbUserId, {
      timeMin,
      timeMax,
      maxResults,
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
