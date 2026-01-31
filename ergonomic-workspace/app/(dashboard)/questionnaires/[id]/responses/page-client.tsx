'use client';

/**
 * Questionnaire Responses Page Client Component
 *
 * View all responses for a questionnaire template.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, RefreshCw, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
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
  const [analysis, setAnalysis] = React.useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

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
            <div className="flex gap-2">
              {data && data.submissions.length > 0 && (
                <Button
                  onClick={async () => {
                    setIsAnalyzing(true);
                    try {
                      const response = await fetch(`/api/questionnaires/${questionnaire.id}/analyze`, {
                        method: 'POST',
                      });
                      if (response.ok) {
                        const result = await response.json();
                        setAnalysis(result.analysis);
                        toast({
                          title: 'Success',
                          description: 'Analysis completed successfully',
                        });
                      } else {
                        throw new Error('Failed to analyze responses');
                      }
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: error instanceof Error ? error.message : 'Failed to analyze responses',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              )}
              <Button onClick={fetchResponses} variant="outline" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
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

      {/* AI Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>AI-powered insights from questionnaire responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.summary && (
              <div>
                <h3 className="font-semibold mb-2">Executive Summary</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
              </div>
            )}

            {analysis.highRiskAreas && analysis.highRiskAreas.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">High-Risk Areas</h3>
                <div className="space-y-2">
                  {analysis.highRiskAreas.map((area: any, index: number) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{area.area}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            area.severity === 'HIGH'
                              ? 'bg-red-100 text-red-800'
                              : area.severity === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {area.severity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{area.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.commonIssues && analysis.commonIssues.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Common Issues</h3>
                <ul className="space-y-2">
                  {analysis.commonIssues.map((issue: any, index: number) => (
                    <li key={index} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{issue.issue}</span>
                        <span className="text-xs text-muted-foreground">
                          Frequency: {issue.frequency}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.focusAreas && analysis.focusAreas.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Focus Areas for On-Site Assessment</h3>
                <ul className="space-y-2">
                  {analysis.focusAreas.map((area: any, index: number) => (
                    <li key={index} className="border rounded p-3">
                      <div className="font-medium mb-1">{area.area}</div>
                      <p className="text-sm text-muted-foreground">{area.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.insights && (
              <div>
                <h3 className="font-semibold mb-2">Insights & Recommendations</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.insights}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
