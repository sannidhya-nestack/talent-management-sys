'use client';

/**
 * Form Submissions Page Client Component
 *
 * Displays submissions for a specific form with options to process, retry, or delete.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  MoreHorizontal,
  Play,
  Trash2,
  ExternalLink,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { strings } from '@/config';
import type { FormSubmissionListItem } from '@/types/form';

interface SubmissionsResponse {
  submissions: FormSubmissionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SubmissionsPageClientProps {
  formId: string;
  formName: string;
}

export function SubmissionsPageClient({ formId, formName }: SubmissionsPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState<SubmissionsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const fetchSubmissions = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/forms/${formId}/submissions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const result: SubmissionsResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [formId, statusFilter]);

  React.useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleRetry = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/forms/${formId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, action: 'retry' }),
      });

      if (!response.ok) {
        throw new Error('Failed to retry submission');
      }

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Submission processed successfully' });
      } else {
        toast({
          title: 'Processing failed',
          description: result.error,
          variant: 'destructive',
        });
      }

      fetchSubmissions();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to retry submission',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      const response = await fetch(
        `/api/forms/${formId}/submissions?submissionId=${submissionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete submission');
      }

      toast({ title: 'Submission deleted' });
      fetchSubmissions();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete submission',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Processed
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/forms/${formId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
          <p className="text-muted-foreground">{formName}</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSED">Processed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchSubmissions} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
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
              <Button variant="outline" size="sm" onClick={fetchSubmissions} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
          <CardDescription>
            {data?.total || 0} total submission{data?.total !== 1 ? 's' : ''}
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
          ) : !data?.submissions.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">
                {strings.applicationForms.noSubmissions}
              </h3>
              <p className="text-muted-foreground mb-4">
                No submissions have been received for this form yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {submission.data.firstName} {submission.data.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {submission.data.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>{formatDate(submission.submittedAt)}</TableCell>
                    <TableCell>
                      {submission.processedAt
                        ? formatDate(submission.processedAt)
                        : '—'}
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
                          {submission.person && (
                            <DropdownMenuItem asChild>
                              <Link href={`/candidates/${submission.person.id}`}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Candidate
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {(submission.status === 'FAILED' ||
                            submission.status === 'PENDING') && (
                            <DropdownMenuItem
                              onClick={() => handleRetry(submission.id)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {submission.status === 'FAILED'
                                ? 'Retry Processing'
                                : 'Process Now'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(submission.id)}
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
