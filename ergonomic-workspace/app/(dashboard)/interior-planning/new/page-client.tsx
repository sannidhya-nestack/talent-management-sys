'use client';

/**
 * New Layout Page Client Component
 *
 * Form for creating a new layout.
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

export function NewLayoutPageClient() {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [clientId, setClientId] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [floorPlanUrl, setFloorPlanUrl] = React.useState('');
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
      const response = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          projectId: projectId || undefined,
          name,
          description: description || undefined,
          floorPlanUrl: floorPlanUrl || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create layout');
      }

      const { layout } = await response.json();

      toast({
        title: 'Success',
        description: 'Layout created successfully',
      });

      router.push(`/interior-planning/${layout.id}`);
    } catch (error) {
      console.error('Error creating layout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create layout',
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
          <h1 className="text-2xl font-bold tracking-tight">Create Layout</h1>
          <p className="text-muted-foreground">
            Design a new workspace layout
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Layout Details</CardTitle>
            <CardDescription>
              Enter the details for the new layout
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

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Layout Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Office Floor Plan"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the layout design..."
                rows={4}
              />
            </div>

            {/* Floor Plan URL */}
            <div className="space-y-2">
              <Label htmlFor="floorPlanUrl">Floor Plan URL</Label>
              <Input
                id="floorPlanUrl"
                value={floorPlanUrl}
                onChange={(e) => setFloorPlanUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Layout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
