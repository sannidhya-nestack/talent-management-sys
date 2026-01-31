/**
 * Calendar Availability API Route
 *
 * GET /api/calendar/availability - Get calendar availability
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCalendarEvents } from '@/lib/services/calendar/google';

/**
 * GET /api/calendar/availability
 *
 * Get available time slots
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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const duration = parseInt(searchParams.get('duration') || '2', 10); // hours

    // Get events for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await getCalendarEvents(session.user.dbUserId, {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
    });

    // Calculate available slots (simplified - assumes 9 AM to 5 PM workday)
    const availableSlots: Array<{ start: string; end: string }> = [];
    const workStart = 9; // 9 AM
    const workEnd = 17; // 5 PM

    // For simplicity, return a message that calendar is available
    // In production, you would calculate actual free slots
    return NextResponse.json({
      available: true,
      message: 'Calendar is available. Select a time slot.',
      busySlots: events.map((event) => ({
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
      })),
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
