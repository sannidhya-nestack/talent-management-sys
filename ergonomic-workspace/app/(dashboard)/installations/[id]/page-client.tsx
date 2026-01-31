'use client';

/**
 * Installation Detail Page Client Component
 *
 * Displays installation details with ability to edit.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Edit } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { InstallationStatus } from '@/lib/types/firestore';
import { formatDate } from '@/lib/utils';

const statusLabels: Record<InstallationStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
};

const statusVariants: Record<InstallationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SCHEDULED: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  ON_HOLD: 'outline',
  CANCELLED: 'destructive',
};

interface InstallationDetail {
  id: string;
  clientId: string;
  projectId: string | null;
  scheduledDate: Date;
  deliveryDate: Date | null;
  completionDate: Date | null;
  status: InstallationStatus;
  notes: string | null;
  client: {
    id: string;
    companyName: string;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InstallationDetailPageClientProps {
  installation: InstallationDetail;
}

export function InstallationDetailPageClient({ installation: initialInstallation }: InstallationDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Form state
  const [scheduledDate, setScheduledDate] = React.useState(
    initialInstallation.scheduledDate ? new Date(initialInstallation.scheduledDate).toISOString().slice(0, 16) : ''
  );
  const [deliveryDate, setDeliveryDate] = React.useState(
    initialInstallation.deliveryDate ? new Date(initialInstallation.deliveryDate).toISOString().slice(0, 16) : ''
  );
  const [status, setStatus] = React.useState<InstallationStatus>(initialInstallation.status);
  const [notes, setNotes] = React.useState(initialInstallation.notes || '');

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/installations/${initialInstallation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
          status,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update installation');
      }

      toast({
        title: 'Success',
        description: 'Installation updated successfully',
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating installation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update installation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Installation Details</h1>
            <p className="text-muted-foreground">
              {initialInstallation.client?.companyName || 'Installation'}
            </p>
          </div>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Installation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Installation Information</CardTitle>
          <CardDescription>
            View and edit installation details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Input
              value={initialInstallation.client?.companyName || 'Unknown'}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Project */}
          {initialInstallation.project && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Input
                value={initialInstallation.project.name}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            {isEditing ? (
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            ) : (
              <Input
                value={formatDate(initialInstallation.scheduledDate)}
                disabled
                className="bg-muted"
              />
            )}
          </div>

          {/* Delivery Date */}
          <div className="space-y-2">
            <Label>Delivery Date</Label>
            {isEditing ? (
              <Input
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            ) : (
              <Input
                value={initialInstallation.deliveryDate ? formatDate(initialInstallation.deliveryDate) : '—'}
                disabled
                className="bg-muted"
              />
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            {isEditing ? (
              <Select value={status} onValueChange={(value) => setStatus(value as InstallationStatus)}>
                <SelectTrigger>
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
            ) : (
              <div>
                <Badge variant={statusVariants[initialInstallation.status] || 'default'}>
                  {statusLabels[initialInstallation.status] || initialInstallation.status}
                </Badge>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            {isEditing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={4}
              />
            ) : (
              <Textarea
                value={initialInstallation.notes || '—'}
                disabled
                className="bg-muted"
                rows={4}
              />
            )}
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
