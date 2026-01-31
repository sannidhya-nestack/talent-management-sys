'use client';

/**
 * Installations Page Client Component
 *
 * Displays list of installations and provides scheduling interface.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Calendar,
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { InstallationListItem } from '@/lib/services/installations';

interface InstallationsResponse {
  installations: InstallationListItem[];
  total: number;
}

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SCHEDULED: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

export function InstallationsPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState<InstallationsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchInstallations = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/installations');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to fetch installations (${response.status})`;
        console.error('API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result: InstallationsResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error fetching installations:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInstallations();
  }, [fetchInstallations]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this installation?')) return;

    try {
      const response = await fetch(`/api/installations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete installation');
      }

      toast({ title: 'Installation deleted' });
      fetchInstallations();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete installation',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Installations</h1>
          <p className="text-muted-foreground">
            Schedule and track workspace installations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchInstallations} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/installations/new">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Installation
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
              <Button variant="outline" size="sm" onClick={fetchInstallations} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Installations</CardTitle>
          <CardDescription>
            Manage scheduled installations and track progress
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
          ) : !data?.installations.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No installations scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Schedule your first installation to get started.
              </p>
              <Button asChild>
                <Link href="/installations/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Installation
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.installations.map((installation) => (
                  <TableRow key={installation.id}>
                    <TableCell>{installation.client.companyName}</TableCell>
                    <TableCell>
                      {installation.project ? installation.project.name : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{formatDate(installation.scheduledDate)}</TableCell>
                    <TableCell>
                      {installation.deliveryDate ? formatDate(installation.deliveryDate) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[installation.status] || 'default'}>
                        {statusLabels[installation.status] || installation.status}
                      </Badge>
                    </TableCell>
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
                            onClick={() => router.push(`/installations/${installation.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(installation.id)}
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
