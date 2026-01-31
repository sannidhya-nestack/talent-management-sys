'use client';

/**
 * Questionnaire Responses Page Client Component
 *
 * View all responses for a questionnaire template.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, RefreshCw, AlertCircle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import type { QuestionnaireWithQuestions } from '@/types/questionnaire';
import { formatDate } from '@/lib/utils';

interface QuestionnaireResponsesPageClientProps {
  questionnaire: QuestionnaireWithQuestions;
}

interface Submission {
  id: string;
  submittedAt: Date;
  responsesCount: number;
  responses: Array<{
    id: string;
    questionId: string;
    answer: any;
    submittedAt: Date;
  }>;
}

interface ResponsesData {
  submissions: Submission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function QuestionnaireResponsesPageClient({ questionnaire }: QuestionnaireResponsesPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState<ResponsesData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchResponses = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/questionnaires/${questionnaire.id}/responses`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to fetch responses (${response.status})`;
        console.error('API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result: ResponsesData = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error fetching responses:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [questionnaire.id]);

  React.useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Questionnaire Responses</h1>
          <p className="text-muted-foreground">{questionnaire.name}</p>
        </div>
      </div>

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

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Responses</CardTitle>
              <CardDescription>
                {data?.total || 0} {data?.total === 1 ? 'response' : 'responses'} total
              </CardDescription>
            </div>
            <Button onClick={fetchResponses} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading responses...</div>
          ) : !data?.submissions.length ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No responses yet</h3>
              <p className="text-muted-foreground">
                Responses will appear here once clients complete the questionnaire.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>{formatDate(submission.submittedAt)}</TableCell>
                    <TableCell>{submission.responsesCount} answers</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
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
