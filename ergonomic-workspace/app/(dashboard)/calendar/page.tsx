/**
 * Calendar Page
 *
 * Main calendar view page with month/week/day views.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCalendarEvents } from '@/lib/services/calendar/google';
import { getUserCalendarAccounts } from '@/lib/services/integrations/calendar';
import { CalendarPageClient } from './page-client';

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user || !session.user.dbUserId) {
    redirect('/');
  }

  // Get user's calendar accounts
  const accounts = await getUserCalendarAccounts(session.user.dbUserId);
  const googleAccount = accounts.find((acc) => acc.provider === 'GOOGLE_CALENDAR');

  // Fetch events if calendar is connected
  let events: Array<{
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
  }> = [];

  if (googleAccount) {
    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead
      events = await getCalendarEvents(session.user.dbUserId, {
        timeMin,
        timeMax,
        maxResults: 100,
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  }

  return <CalendarPageClient initialEvents={events} hasCalendarConnected={!!googleAccount} />;
}
