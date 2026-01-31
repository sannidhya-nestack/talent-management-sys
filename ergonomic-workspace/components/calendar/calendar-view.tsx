'use client';

/**
 * Calendar View Component
 *
 * Displays calendar events in month, week, or day view.
 */

import * as React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ViewType = 'month' | 'week' | 'day';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}

interface CalendarViewProps {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarView({ events = [], onEventClick }: CalendarViewProps) {
  const [view, setView] = React.useState<ViewType>('month');
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'month' && (
          <MonthView currentDate={currentDate} events={events} onEventClick={onEventClick} />
        )}
        {view === 'week' && (
          <WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} />
        )}
        {view === 'day' && (
          <DayView currentDate={currentDate} events={events} onEventClick={onEventClick} />
        )}
      </CardContent>
    </Card>
  );
}

function MonthView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Generate calendar days
  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Previous month days
  const prevMonth = new Date(year, month - 1, 0);
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonth.getDate() - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  // Next month days to fill the grid
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((event) => {
      const eventDate = event.start.date || event.start.dateTime?.split('T')[0];
      return eventDate === dateStr;
    });
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">{monthName}</h3>
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          const dayEvents = getEventsForDate(day.date);
          const isToday =
            day.date.toDateString() === new Date().toDateString() && day.isCurrentMonth;

          return (
            <div
              key={index}
              className={`min-h-[100px] border p-1 ${
                day.isCurrentMonth ? 'bg-background' : 'bg-muted/30'
              } ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <div
                className={`text-sm ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'} ${isToday ? 'font-bold' : ''}`}
              >
                {day.date.getDate()}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="cursor-pointer truncate rounded bg-primary/10 px-1 text-xs text-primary hover:bg-primary/20"
                    onClick={() => onEventClick?.(event)}
                    title={event.summary}
                  >
                    {event.summary}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  // Get start of week (Sunday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((event) => {
      const eventDate = event.start.date || event.start.dateTime?.split('T')[0];
      return eventDate === dateStr;
    });
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div key={index} className="border rounded-lg p-2">
              <div
                className={`mb-2 text-sm font-medium ${isToday ? 'text-primary font-bold' : ''}`}
              >
                {day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
              </div>
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="cursor-pointer rounded bg-primary/10 p-1 text-xs hover:bg-primary/20"
                    onClick={() => onEventClick?.(event)}
                  >
                    {event.summary}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const dateStr = currentDate.toISOString().split('T')[0];
  const dayEvents = events.filter((event) => {
    const eventDate = event.start.date || event.start.dateTime?.split('T')[0];
    return eventDate === dateStr;
  });

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">
        {currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </h3>
      <div className="space-y-2">
        {dayEvents.length === 0 ? (
          <p className="text-muted-foreground">No events scheduled for this day</p>
        ) : (
          dayEvents.map((event) => (
            <div
              key={event.id}
              className="cursor-pointer rounded-lg border p-4 hover:bg-accent"
              onClick={() => onEventClick?.(event)}
            >
              <div className="font-semibold">{event.summary}</div>
              {event.start.dateTime && (
                <div className="text-sm text-muted-foreground">
                  {new Date(event.start.dateTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {event.end.dateTime &&
                    new Date(event.end.dateTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                </div>
              )}
              {event.location && (
                <div className="text-sm text-muted-foreground">📍 {event.location}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
