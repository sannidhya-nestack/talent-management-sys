'use client';

/**
 * Layout Detail Page Client Component
 *
 * Displays layout details with ability to edit.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

interface LayoutDetail {
  id: string;
  clientId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  floorPlanUrl: string | null;
  layoutData: Record<string, unknown> | null;
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

interface LayoutDetailPageClientProps {
  layout: LayoutDetail;
}

export function LayoutDetailPageClient({ layout: initialLayout }: LayoutDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Form state
  const [name, setName] = React.useState(initialLayout.name);
  const [description, setDescription] = React.useState(initialLayout.description || '');
  const [floorPlanUrl, setFloorPlanUrl] = React.useState(initialLayout.floorPlanUrl || '');

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/layouts/${initialLayout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          floorPlanUrl: floorPlanUrl || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update layout');
      }

      toast({
        title: 'Success',
        description: 'Layout updated successfully',
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating layout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update layout',
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
            <h1 className="text-2xl font-bold tracking-tight">Layout Details</h1>
            <p className="text-muted-foreground">
              {initialLayout.client?.companyName || 'Layout'}
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

      {/* Layout Details */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Information</CardTitle>
          <CardDescription>
            View and edit layout details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Input
              value={initialLayout.client?.companyName || 'Unknown'}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Project */}
          {initialLayout.project && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Input
                value={initialLayout.project.name}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label>Layout Name</Label>
            {isEditing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            ) : (
              <Input value={initialLayout.name} disabled className="bg-muted" />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the layout..."
                rows={4}
              />
            ) : (
              <Textarea
                value={initialLayout.description || '—'}
                disabled
                className="bg-muted"
                rows={4}
              />
            )}
          </div>

          {/* Floor Plan URL */}
          <div className="space-y-2">
            <Label>Floor Plan URL</Label>
            {isEditing ? (
              <Input
                value={floorPlanUrl}
                onChange={(e) => setFloorPlanUrl(e.target.value)}
                placeholder="https://..."
              />
            ) : (
              <div>
                {initialLayout.floorPlanUrl ? (
                  <a
                    href={initialLayout.floorPlanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {initialLayout.floorPlanUrl}
                  </a>
                ) : (
                  <Input value="—" disabled className="bg-muted" />
                )}
              </div>
            )}
          </div>

          {/* Created Date */}
          <div className="space-y-2">
            <Label>Created</Label>
            <Input
              value={formatDate(initialLayout.createdAt)}
              disabled
              className="bg-muted"
            />
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
