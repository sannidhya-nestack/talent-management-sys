'use client';

/**
 * New Assessment Page Client Component
 *
 * Form for creating a new assessment.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AssessmentType, AssessmentStatus } from '@/lib/types/firestore';
import { Calendar, MapPin } from 'lucide-react';

const typeLabels: Record<AssessmentType, string> = {
  WORKSPACE: 'Workspace',
  ERGONOMIC: 'Ergonomic',
  LIGHTING: 'Lighting',
  AIR_QUALITY: 'Air Quality',
  COMPREHENSIVE: 'Comprehensive',
};

const statusLabels: Record<AssessmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  REPORT_GENERATED: 'Report Generated',
  CANCELLED: 'Cancelled',
};

export function NewAssessmentPageClient() {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [clientId, setClientId] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [type, setType] = React.useState<AssessmentType>('COMPREHENSIVE');
  const [status, setStatus] = React.useState<AssessmentStatus>('SCHEDULED');
  const [conductedDate, setConductedDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [duration, setDuration] = React.useState('2'); // Default 2 hours
  const [clients, setClients] = React.useState<Array<{ id: string; companyName: string; address?: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingClients, setIsLoadingClients] = React.useState(true);
  const [hasCalendarConnected, setHasCalendarConnected] = React.useState(false);
  const [createCalendarEvent, setCreateCalendarEvent] = React.useState(true);

  // Fetch clients
  React.useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients?limit=100');
        if (response.ok) {
          const data = await response.json();
          setClients(data.clients || []);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Check if calendar is connected
  React.useEffect(() => {
    fetch('/api/integrations/calendar/accounts')
      .then((res) => res.json())
      .then((data) => {
        setHasCalendarConnected(data.accounts && data.accounts.length > 0);
      })
      .catch(console.error);
  }, []);

  // Auto-fill location when client is selected
  React.useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client && client.address && !location) {
        setLocation(client.address);
      }
    }
  }, [clientId, clients, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          projectId: projectId || undefined,
          type,
          status,
          conductedDate: conductedDate || undefined,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create assessment');
      }

      const { assessment } = await response.json();

      // Create calendar event if requested and calendar is connected
      if (createCalendarEvent && hasCalendarConnected && conductedDate) {
        try {
          const assessmentDate = new Date(conductedDate);
          const endDate = new Date(assessmentDate);
          endDate.setHours(endDate.getHours() + parseInt(duration));

          await fetch('/api/calendar/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: `${typeLabels[type]} Assessment - ${clients.find((c) => c.id === clientId)?.companyName || 'Client'}`,
              description: notes || `Workspace assessment for client`,
              start: {
                dateTime: assessmentDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              location: location || undefined,
            }),
          });
        } catch (error) {
          console.error('Error creating calendar event:', error);
          // Don't fail the assessment creation if calendar event fails
        }
      }

      toast({
        title: 'Success',
        description: 'Assessment created successfully',
      });

      router.push(`/assessments/${assessment.id}`);
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create assessment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Assessment</h1>
          <p className="text-muted-foreground">
            Schedule a new workspace assessment
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
            <CardDescription>
              Enter the details for the new assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select
                value={clientId}
                onValueChange={setClientId}
                disabled={isLoadingClients}
                required
              >
                <SelectTrigger id="clientId">
                  <SelectValue placeholder={isLoadingClients ? 'Loading clients...' : 'Select a client'} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Selection (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="projectId">Project (Optional)</Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Project ID (if applicable)"
              />
            </div>

            {/* Assessment Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Assessment Type *</Label>
              <Select value={type} onValueChange={(value) => setType(value as AssessmentType)} required>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AssessmentStatus)} required>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conducted Date */}
            <div className="space-y-2">
              <Label htmlFor="conductedDate">Conducted Date & Time *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="conductedDate"
                  type="datetime-local"
                  value={conductedDate}
                  onChange={(e) => setConductedDate(e.target.value)}
                  required
                />
                {hasCalendarConnected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Fetch calendar availability
                      try {
                        const response = await fetch('/api/calendar/availability');
                        if (response.ok) {
                          const data = await response.json();
                          // Show availability in a dialog or suggest times
                          toast({
                            title: 'Calendar Available',
                            description: 'Check your calendar for available times',
                          });
                        }
                      } catch (error) {
                        console.error('Error checking availability:', error);
                      }
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Check Availability
                  </Button>
                )}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="8"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="2"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Assessment location (auto-filled from client address)"
                />
              </div>
            </div>

            {/* Create Calendar Event */}
            {hasCalendarConnected && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="createCalendarEvent"
                  checked={createCalendarEvent}
                  onChange={(e) => setCreateCalendarEvent(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="createCalendarEvent" className="cursor-pointer">
                  Create calendar event for this assessment
                </Label>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this assessment..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
