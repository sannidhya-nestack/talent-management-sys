'use client';

/**
 * New Installation Page Client Component
 *
 * Form for scheduling a new installation.
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
import { InstallationStatus } from '@/lib/types/firestore';

const statusLabels: Record<InstallationStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
};

export function NewInstallationPageClient() {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [clientId, setClientId] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [scheduledDate, setScheduledDate] = React.useState('');
  const [deliveryDate, setDeliveryDate] = React.useState('');
  const [status, setStatus] = React.useState<InstallationStatus>('SCHEDULED');
  const [notes, setNotes] = React.useState('');
  const [clients, setClients] = React.useState<Array<{ id: string; companyName: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingClients, setIsLoadingClients] = React.useState(true);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/installations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          projectId: projectId || undefined,
          scheduledDate: scheduledDate || undefined,
          deliveryDate: deliveryDate || undefined,
          status,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule installation');
      }

      const { installation } = await response.json();

      toast({
        title: 'Success',
        description: 'Installation scheduled successfully',
      });

      router.push(`/installations/${installation.id}`);
    } catch (error) {
      console.error('Error scheduling installation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule installation',
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
          <h1 className="text-2xl font-bold tracking-tight">Schedule Installation</h1>
          <p className="text-muted-foreground">
            Schedule a new workspace installation
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Installation Details</CardTitle>
            <CardDescription>
              Enter the details for the new installation
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

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date *</Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>

            {/* Delivery Date */}
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as InstallationStatus)} required>
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

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this installation..."
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
                {isLoading ? 'Scheduling...' : 'Schedule Installation'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
