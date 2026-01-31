'use client';

/**
 * Assessments Page Client Component
 *
 * Displays list of assessment templates with actions for creating, editing, and managing.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ClipboardCheck,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  Eye,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Users,
  CheckCircle2,
  Clock,
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
import type { AssessmentTemplateListItem } from '@/types/assessment';

interface AssessmentsResponse {
  templates: AssessmentTemplateListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function AssessmentsPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState<AssessmentsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTemplates = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/assessments');
      if (!response.ok) {
        throw new Error('Failed to fetch assessment templates');
      }

      const result: AssessmentsResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCopyLink = async (slug: string) => {
    // Note: Real URL will include person/application IDs via email
    const url = `${window.location.origin}/assess/${slug}`;
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied',
      description: 'Assessment URL copied to clipboard (personId required)',
    });
  };

  const handleToggleActive = async (id: string) => {
    try {
      const response = await fetch(`/api/assessments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleActive' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      toast({ title: 'Template updated' });
      fetchTemplates();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, sessionsCount: number) => {
    if (sessionsCount > 0) {
      toast({
        title: 'Cannot delete',
        description: 'This template has existing sessions. Deactivate it instead.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this assessment template?')) return;

    try {
      const response = await fetch(`/api/assessments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete template');
      }

      toast({ title: 'Template deleted' });
      fetchTemplates();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete template',
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

  const getTypeLabel = (type: string) => {
    return type === 'GENERAL_COMPETENCIES' ? 'General' : 'Specialized';
  };

  const getTypeVariant = (type: string): 'default' | 'secondary' => {
    return type === 'GENERAL_COMPETENCIES' ? 'default' : 'secondary';
  };

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!data?.templates) return null;
    const total = data.templates.length;
    const active = data.templates.filter(t => t.isActive).length;
    const gc = data.templates.filter(t => t.type === 'GENERAL_COMPETENCIES').length;
    const sc = data.templates.filter(t => t.type === 'SPECIALIZED_COMPETENCIES').length;
    const totalSessions = data.templates.reduce((sum, t) => sum + t.sessionsCount, 0);
    return { total, active, gc, sc, totalSessions };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">
            Create and manage assessment questionnaires for candidates
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTemplates} variant="outline" disabled={isLoading}>
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">General Competencies</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.gc}</div>
              <p className="text-xs text-muted-foreground">GC templates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Specialized</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sc}</div>
              <p className="text-xs text-muted-foreground">SC templates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">Attempts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTemplates} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assessment Templates</CardTitle>
          <CardDescription>
            Manage your assessment questionnaires and view responses
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
          ) : !data?.templates.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No assessment templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first assessment template to start evaluating candidates.
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          /{template.slug} • {template.questionsCount} questions
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeVariant(template.type)}>
                        {getTypeLabel(template.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.position || <span className="text-muted-foreground">All roles</span>}
                    </TableCell>
                    <TableCell>
                      {template.passingScore}/{template.maxScore}
                      {template.timeLimit && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({template.timeLimit}min)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{template.sessionsCount}</TableCell>
                    <TableCell>{formatDate(template.createdAt)}</TableCell>
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
                            onClick={() => router.push(`/assessments/${template.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/assessments/${template.id}/responses`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Responses
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(template.slug)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/assess/${template.slug}`, '_blank')
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(template.id)}
                          >
                            {template.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(template.id, template.sessionsCount)}
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
