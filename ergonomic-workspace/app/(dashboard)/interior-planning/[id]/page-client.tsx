'use client';

/**
 * Layout Detail Page Client Component
 *
 * Displays layout details with ability to edit.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Edit, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { LayoutDesigner } from '@/components/interior-planning/designer';
import { Layout3DViewer } from '@/components/interior-planning/3d-viewer';
import { ProposalViewer } from '@/components/interior-planning/proposal-viewer';
import type { FurnitureItem } from '@/components/interior-planning/designer';
import type { Proposal } from '@/lib/services/proposals';

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
  const [activeTab, setActiveTab] = React.useState('details');
  const [show3DView, setShow3DView] = React.useState(false);
  const [proposal, setProposal] = React.useState<Proposal | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = React.useState(false);
  const [furnitureItems, setFurnitureItems] = React.useState<FurnitureItem[]>(() => {
    // Load furniture items from layoutData if available
    if (initialLayout.layoutData && typeof initialLayout.layoutData === 'object' && 'furniture' in initialLayout.layoutData) {
      return (initialLayout.layoutData.furniture as FurnitureItem[]) || [];
    }
    return [];
  });

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

  const handleSaveDesign = async (items: FurnitureItem[]) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/layouts/${initialLayout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutData: {
            ...(initialLayout.layoutData as Record<string, unknown> || {}),
            furniture: items,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save design');
      }

      setFurnitureItems(items);
      toast({
        title: 'Success',
        description: 'Design saved successfully',
      });
    } catch (error) {
      console.error('Error saving design:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save design',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProposal = async () => {
    setIsGeneratingProposal(true);
    try {
      const response = await fetch(`/api/layouts/${initialLayout.id}/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeCustomSections: true,
          pricingTier: 'STANDARD',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate proposal');
      }

      const data = await response.json();
      setProposal({
        ...data.proposal,
        id: `proposal-${Date.now()}`,
        status: 'DRAFT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: 'Success',
        description: 'Proposal generated successfully',
      });
    } catch (error) {
      console.error('Error generating proposal:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate proposal',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
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
        {!isEditing && activeTab === 'details' && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="design">
            <Layout className="h-4 w-4 mr-2" />
            Design
          </TabsTrigger>
          <TabsTrigger value="proposal">Proposal</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex-1">
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
        </TabsContent>

        <TabsContent value="design" className="flex-1 flex flex-col min-h-0">
          {show3DView ? (
            <div className="flex-1 min-h-0">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">3D Visualization</h3>
                <Button
                  variant="outline"
                  onClick={() => setShow3DView(false)}
                >
                  Back to Designer
                </Button>
              </div>
              <Layout3DViewer
                furnitureItems={furnitureItems}
                floorPlanDimensions={{ width: 2000, height: 1500 }}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <div className="mb-4 flex items-center justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShow3DView(true)}
                  disabled={furnitureItems.length === 0}
                >
                  View in 3D
                </Button>
              </div>
              <LayoutDesigner
                layoutId={initialLayout.id}
                floorPlanUrl={floorPlanUrl || null}
                initialItems={furnitureItems}
                onSave={handleSaveDesign}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="proposal" className="space-y-4">
          {proposal ? (
            <ProposalViewer
              proposal={proposal}
              onExport={(format) => {
                toast({
                  title: 'Export',
                  description: `Exporting as ${format.toUpperCase()}...`,
                });
              }}
              onSend={() => {
                toast({
                  title: 'Send Proposal',
                  description: 'Sending proposal to client...',
                });
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Generate Proposal</CardTitle>
                <CardDescription>
                  Generate an AI-powered proposal with design rationale, product specifications, and pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateProposal}
                  disabled={isGeneratingProposal || furnitureItems.length === 0}
                  size="lg"
                >
                  {isGeneratingProposal ? 'Generating...' : 'Generate Proposal'}
                </Button>
                {furnitureItems.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Add furniture items to the design first before generating a proposal.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
