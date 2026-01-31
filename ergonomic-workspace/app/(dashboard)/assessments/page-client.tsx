'use client';

/**
 * Assessments Page Client Component
 *
 * Displays list of assessments with actions for creating, viewing, and managing.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ClipboardCheck,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
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
import type { AssessmentListItem } from '@/lib/services/assessments';
import { AssessmentStatus, AssessmentType } from '@/lib/types/firestore';
import { formatDate } from '@/lib/utils';

interface AssessmentsResponse {
  assessments: AssessmentListItem[];
  total: number;
}

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

const typeLabels: Record<AssessmentType, string> = {
  WORKSPACE: 'Workspace',
  ERGONOMIC: 'Ergonomic',
  LIGHTING: 'Lighting',
  AIR_QUALITY: 'Air Quality',
  COMPREHENSIVE: 'Comprehensive',
};

export function AssessmentsPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState<AssessmentsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAssessments = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/assessments');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to fetch assessments (${response.status})`;
        console.error('API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result: AssessmentsResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error fetching assessments:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    try {
      const response = await fetch(`/api/assessments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete assessment');
      }

      toast({ title: 'Assessment deleted' });
      fetchAssessments();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete assessment',
        variant: 'destructive',
      });
    }
  };

  const formatDateDisplay = (date: Date | string | null) => {
    if (!date) return '—';
    return formatDate(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">
            Manage workspace assessments and reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAssessments} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/assessments/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
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
              <Button variant="outline" size="sm" onClick={fetchAssessments} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assessments</CardTitle>
          <CardDescription>
            {data?.total || 0} {data?.total === 1 ? 'assessment' : 'assessments'} total
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
          ) : !data?.assessments.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No assessments yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first assessment to start evaluating workspaces.
              </p>
              <Button asChild>
                <Link href="/assessments/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assessment
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conducted Date</TableHead>
                  <TableHead>Conducted By</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell className="font-medium">
                      {assessment.client.companyName}
                    </TableCell>
                    <TableCell>{typeLabels[assessment.type]}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[assessment.status] || 'default'}>
                        {statusLabels[assessment.status] || assessment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateDisplay(assessment.conductedDate)}</TableCell>
                    <TableCell>
                      {assessment.conductedByUser?.displayName || '—'}
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
                            onClick={() => router.push(`/assessments/${assessment.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/assessments/${assessment.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(assessment.id)}
                            className="text-destructive"
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
