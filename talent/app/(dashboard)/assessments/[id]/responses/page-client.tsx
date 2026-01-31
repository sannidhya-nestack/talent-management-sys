'use client';

/**
 * Assessment Responses Page Client Component
 *
 * View all sessions/responses for a specific assessment template.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  User,
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
import { Badge } from '@/components/ui/badge';
import type { AssessmentTemplateWithQuestions } from '@/types/assessment';
import type { SessionStatus } from '@/lib/generated/prisma/client';

interface ResponsesPageClientProps {
  template: AssessmentTemplateWithQuestions;
}

interface SessionData {
  id: string;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  passed: boolean | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ResponsesData {
  sessions: SessionData[];
  total: number;
  page: number;
  totalPages: number;
}

const statusIcons: Record<SessionStatus, typeof CheckCircle2> = {
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle2,
  EXPIRED: AlertCircle,
  ABANDONED: XCircle,
};

const statusColors: Record<SessionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  IN_PROGRESS: 'secondary',
  COMPLETED: 'default',
  EXPIRED: 'destructive',
  ABANDONED: 'outline',
};

export function ResponsesPageClient({ template }: ResponsesPageClientProps) {
  const router = useRouter();
  const [data, setData] = React.useState<ResponsesData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchResponses = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/assessments/${template.id}/responses`);
      if (!response.ok) {
        throw new Error('Failed to fetch responses');
      }

      const result: ResponsesData = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [template.id]);

  React.useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!data?.sessions) return null;
    const total = data.sessions.length;
    const completed = data.sessions.filter((s) => s.status === 'COMPLETED').length;
    const passed = data.sessions.filter((s) => s.passed === true).length;
    const scores = data.sessions.filter((s) => s.score !== null).map((s) => s.score!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { total, completed, passed, avgScore };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/assessments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{template.name}</h1>
          <p className="text-muted-foreground">Assessment responses and results</p>
        </div>
        <Button onClick={fetchResponses} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completed > 0 ? Math.round((stats.passed / stats.completed) * 100) : 0}% pass rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avgScore}/{template.maxScore}
              </div>
              <p className="text-xs text-muted-foreground">
                Passing: {template.passingScore}
              </p>
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
              <Button variant="outline" size="sm" onClick={fetchResponses} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>
            View candidate assessment sessions and their results
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
          ) : !data?.sessions.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No sessions yet</h3>
              <p className="text-muted-foreground">
                No one has taken this assessment yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessions.map((session) => {
                  const StatusIcon = statusIcons[session.status];
                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {session.person.firstName} {session.person.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {session.person.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[session.status]} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {session.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {session.score !== null ? (
                          <span>
                            {session.score}/{template.maxScore}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {session.passed !== null ? (
                          session.passed ? (
                            <Badge variant="default" className="bg-green-600">
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(session.startedAt)}</TableCell>
                      <TableCell>
                        {session.completedAt ? (
                          formatDate(session.completedAt)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
