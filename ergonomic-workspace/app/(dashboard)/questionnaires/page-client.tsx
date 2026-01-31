'use client';

/**
 * Questionnaires Page Client Component
 *
 * Displays list of questionnaire templates with actions for creating, editing, and managing.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  Eye,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
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
import type { QuestionnaireListItem } from '@/types/questionnaire';

interface QuestionnairesResponse {
  questionnaires: QuestionnaireListItem[];
  total: number;
}

export function QuestionnairesPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState<QuestionnairesResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchQuestionnaires = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/questionnaires');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to fetch questionnaires (${response.status})`;
        console.error('API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result: QuestionnairesResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error fetching questionnaires:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchQuestionnaires();
  }, [fetchQuestionnaires]);

  const handleCopyLink = async (id: string) => {
    const url = `${window.location.origin}/questionnaire/${id}`;
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied',
      description: 'Questionnaire URL copied to clipboard',
    });
  };

  const handleToggleActive = async (id: string) => {
    try {
      const response = await fetch(`/api/questionnaires/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }), // Toggle will be handled by backend
      });

      if (!response.ok) {
        throw new Error('Failed to update questionnaire');
      }

      toast({ title: 'Questionnaire updated' });
      fetchQuestionnaires();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update questionnaire',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, responsesCount: number) => {
    if (responsesCount > 0) {
      toast({
        title: 'Cannot delete',
        description: 'This questionnaire has existing responses. Deactivate it instead.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this questionnaire template?')) return;

    try {
      const response = await fetch(`/api/questionnaires/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete questionnaire');
      }

      toast({ title: 'Questionnaire deleted' });
      fetchQuestionnaires();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete questionnaire',
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

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!data?.questionnaires) return null;
    const total = data.questionnaires.length;
    const active = data.questionnaires.filter(q => q.isActive).length;
    const totalResponses = data.questionnaires.reduce((sum, q) => sum + q.responsesCount, 0);
    return { total, active, totalResponses };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Questionnaires</h1>
          <p className="text-muted-foreground">
            Create and manage workspace assessment questionnaires for clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchQuestionnaires} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/questionnaires/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Questionnaire
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalResponses}</div>
              <p className="text-xs text-muted-foreground">Client responses</p>
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
              <Button variant="outline" size="sm" onClick={fetchQuestionnaires} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questionnaires Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Questionnaire Templates</CardTitle>
          <CardDescription>
            Manage your workspace assessment questionnaires and view responses
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
          ) : !data?.questionnaires.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No questionnaire templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first questionnaire template to start collecting client workspace assessments.
              </p>
              <Button asChild>
                <Link href="/questionnaires/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Questionnaire
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.questionnaires.map((questionnaire) => (
                  <TableRow key={questionnaire.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{questionnaire.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {questionnaire.questionsCount} questions
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{questionnaire.questionsCount}</TableCell>
                    <TableCell>{questionnaire.responsesCount}</TableCell>
                    <TableCell>
                      <Badge variant={questionnaire.isActive ? 'default' : 'secondary'}>
                        {questionnaire.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(questionnaire.createdAt)}</TableCell>
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
                            onClick={() => router.push(`/questionnaires/${questionnaire.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/questionnaires/${questionnaire.id}/responses`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Responses
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(questionnaire.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/questionnaire/${questionnaire.id}`, '_blank')
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(questionnaire.id)}
                          >
                            {questionnaire.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(questionnaire.id, questionnaire.responsesCount)}
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
