'use client';

/**
 * Interior Planning Page Client Component
 *
 * Displays list of layouts and provides access to layout designer.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Layout,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { LayoutListItem } from '@/lib/services/layouts';

interface LayoutsResponse {
  layouts: LayoutListItem[];
  total: number;
}

export function InteriorPlanningPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState<LayoutsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLayouts = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/layouts');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to fetch layouts (${response.status})`;
        console.error('API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result: LayoutsResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error fetching layouts:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLayouts();
  }, [fetchLayouts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this layout?')) return;

    try {
      const response = await fetch(`/api/layouts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete layout');
      }

      toast({ title: 'Layout deleted' });
      fetchLayouts();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete layout',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interior Planning</h1>
          <p className="text-muted-foreground">
            Design and manage workspace layouts for clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchLayouts} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/interior-planning/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Layout
            </Link>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchLayouts} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Layouts</CardTitle>
          <CardDescription>
            Manage workspace layouts and floor plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-12 bg-muted rounded flex-1" />
                </div>
              ))}
            </div>
          ) : !data?.layouts.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layout className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No layouts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first layout to start planning workspace designs.
              </p>
              <Button asChild>
                <Link href="/interior-planning/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Layout
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.layouts.map((layout) => (
                  <TableRow key={layout.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{layout.name}</span>
                        {layout.description && (
                          <span className="text-xs text-muted-foreground">
                            {layout.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{layout.client.companyName}</TableCell>
                    <TableCell>
                      {layout.project ? layout.project.name : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{formatDate(layout.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/interior-planning/${layout.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(layout.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
