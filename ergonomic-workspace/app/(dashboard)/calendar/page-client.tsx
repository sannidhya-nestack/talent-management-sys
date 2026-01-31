'use client';

/**
 * Calendar Page Client Component
 */

import * as React from 'react';
import { CalendarView } from '@/components/calendar/calendar-view';
import { Button } from '@/components/ui/button';
import { Link } from 'next/link';
import { Settings } from 'lucide-react';

interface CalendarPageClientProps {
  initialEvents: Array<{
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
  }>;
  hasCalendarConnected: boolean;
}

export function CalendarPageClient({
  initialEvents,
  hasCalendarConnected,
}: CalendarPageClientProps) {
  const [events] = React.useState(initialEvents);

  if (!hasCalendarConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">Connect a calendar to view events</p>
        <Button asChild>
          <Link href="/settings/integrations/calendar">
            <Settings className="mr-2 h-4 w-4" />
            Connect Calendar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Button variant="outline" asChild>
          <Link href="/settings/integrations/calendar">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>
      <CalendarView
        events={events}
        onEventClick={(event) => {
          // Could open event details modal
          console.log('Event clicked:', event);
        }}
      />
    </div>
  );
}
