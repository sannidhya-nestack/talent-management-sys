'use client';

/**
 * Assessment Detail Page Client Component
 *
 * Displays assessment details with ability to edit.
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
import { AssessmentStatus, AssessmentType } from '@/lib/types/firestore';
import { formatDate } from '@/lib/utils';

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

const statusVariants: Record<AssessmentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SCHEDULED: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  REPORT_GENERATED: 'secondary',
  CANCELLED: 'destructive',
};

interface AssessmentDetail {
  id: string;
  clientId: string;
  projectId: string | null;
  type: AssessmentType;
  status: AssessmentStatus;
  conductedDate: Date | null;
  notes: string | null;
  findings: Record<string, unknown> | null;
  recommendations: Record<string, unknown> | null;
  reportUrl: string | null;
  client: {
    id: string;
    companyName: string;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  conductedByUser: {
    id: string;
    displayName: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AssessmentDetailPageClientProps {
  assessment: AssessmentDetail;
}

export function AssessmentDetailPageClient({ assessment: initialAssessment }: AssessmentDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Form state
  const [type, setType] = React.useState<AssessmentType>(initialAssessment.type);
  const [status, setStatus] = React.useState<AssessmentStatus>(initialAssessment.status);
  const [conductedDate, setConductedDate] = React.useState(
    initialAssessment.conductedDate ? new Date(initialAssessment.conductedDate).toISOString().slice(0, 16) : ''
  );
  const [notes, setNotes] = React.useState(initialAssessment.notes || '');
  const [reportUrl, setReportUrl] = React.useState(initialAssessment.reportUrl || '');

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/assessments/${initialAssessment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          status,
          conductedDate: conductedDate ? new Date(conductedDate).toISOString() : null,
          notes: notes || null,
          reportUrl: reportUrl || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update assessment');
      }

      toast({
        title: 'Success',
        description: 'Assessment updated successfully',
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating assessment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update assessment',
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
            <h1 className="text-2xl font-bold tracking-tight">Assessment Details</h1>
            <p className="text-muted-foreground">
              {initialAssessment.client?.companyName || 'Assessment'}
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

      {/* Assessment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Information</CardTitle>
          <CardDescription>
            View and edit assessment details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Input
              value={initialAssessment.client?.companyName || 'Unknown'}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Project */}
          {initialAssessment.project && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Input
                value={initialAssessment.project.name}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Type */}
          <div className="space-y-2">
            <Label>Assessment Type</Label>
            {isEditing ? (
              <Select value={type} onValueChange={(value) => setType(value as AssessmentType)}>
                <SelectTrigger>
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
            ) : (
              <Input value={typeLabels[initialAssessment.type]} disabled className="bg-muted" />
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            {isEditing ? (
              <Select value={status} onValueChange={(value) => setStatus(value as AssessmentStatus)}>
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
                <Badge variant={statusVariants[initialAssessment.status] || 'default'}>
                  {statusLabels[initialAssessment.status] || initialAssessment.status}
                </Badge>
              </div>
            )}
          </div>

          {/* Conducted Date */}
          <div className="space-y-2">
            <Label>Conducted Date</Label>
            {isEditing ? (
              <Input
                type="datetime-local"
                value={conductedDate}
                onChange={(e) => setConductedDate(e.target.value)}
              />
            ) : (
              <Input
                value={initialAssessment.conductedDate ? formatDate(initialAssessment.conductedDate) : '—'}
                disabled
                className="bg-muted"
              />
            )}
          </div>

          {/* Conducted By */}
          {initialAssessment.conductedByUser && (
            <div className="space-y-2">
              <Label>Conducted By</Label>
              <Input
                value={initialAssessment.conductedByUser.displayName}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Report URL */}
          <div className="space-y-2">
            <Label>Report URL</Label>
            {isEditing ? (
              <Input
                value={reportUrl}
                onChange={(e) => setReportUrl(e.target.value)}
                placeholder="https://..."
              />
            ) : (
              <Input
                value={initialAssessment.reportUrl || '—'}
                disabled
                className="bg-muted"
              />
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
                value={initialAssessment.notes || '—'}
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
