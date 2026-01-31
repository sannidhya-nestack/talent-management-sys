'use client';

/**
 * Assessment Page Client Component
 *
 * Handles the assessment taking experience:
 * 1. Info screen (before starting)
 * 2. Question navigation
 * 3. Answer submission
 * 4. Results display
 */

import * as React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { PublicAssessmentData, PublicQuestion, AnswerData, SessionResult } from '@/types/assessment';

interface AssessmentPageClientProps {
  template: PublicAssessmentData;
  slug: string;
  personId?: string;
  applicationId?: string;
}

type Phase = 'intro' | 'questions' | 'submitting' | 'results' | 'error';

export function AssessmentPageClient({
  template,
  slug,
  personId,
  applicationId,
}: AssessmentPageClientProps) {
  // State
  const [phase, setPhase] = React.useState<Phase>('intro');
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Map<string, AnswerData>>(new Map());
  const [result, setResult] = React.useState<SessionResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<number | null>(null);
  const [personName, setPersonName] = React.useState<string>('');
  const [isForcingPass, setIsForcingPass] = React.useState(false);
  const [debugMode, setDebugMode] = React.useState(false);

  // Timer effect
  React.useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug: Fill all answers with sample data
  const fillAllAnswers = () => {
    const newAnswers = new Map<string, AnswerData>();
    
    questions.forEach((question) => {
      switch (question.type) {
        case 'MULTIPLE_CHOICE': {
          const options = question.options as { id: string; text: string }[];
          if (options.length > 0) {
            // Select the first option
            newAnswers.set(question.id, {
              type: 'MULTIPLE_CHOICE',
              selectedOptionId: options[0].id,
            });
          }
          break;
        }
        case 'MULTIPLE_SELECT': {
          const options = question.options as { id: string; text: string }[];
          if (options.length > 0) {
            // Select first 2 options
            newAnswers.set(question.id, {
              type: 'MULTIPLE_SELECT',
              selectedOptionIds: options.slice(0, Math.min(2, options.length)).map(o => o.id),
            });
          }
          break;
        }
        case 'LIKERT_SCALE': {
          // Select middle option (3 out of 5)
          newAnswers.set(question.id, {
            type: 'LIKERT_SCALE',
            value: 3,
          });
          break;
        }
        case 'RATING': {
          // Select middle rating (5 out of 10)
          newAnswers.set(question.id, {
            type: 'RATING',
            value: 5,
          });
          break;
        }
        case 'TRUE_FALSE': {
          // Select true
          newAnswers.set(question.id, {
            type: 'TRUE_FALSE',
            value: true,
          });
          break;
        }
        case 'TEXT': {
          // Fill with sample text
          newAnswers.set(question.id, {
            type: 'TEXT',
            value: 'This is a sample answer for testing purposes.',
          });
          break;
        }
      }
    });
    
    setAnswers(newAnswers);
  };

  // Start assessment in debug mode (without personId)
  const handleDebugStart = async () => {
    try {
      const response = await fetch(`/api/assess/${slug}/questions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load questions');
      }

      const data = await response.json();

      // Use a mock session ID for debug mode
      setSessionId('debug-session');
      setQuestions(data.questions);
      setPersonName('Debug Mode');
      setDebugMode(true);

      // Set a mock expiration time if template has time limit
      if (template.timeLimit) {
        const mockExpiresAt = new Date(Date.now() + template.timeLimit * 60 * 1000);
        setExpiresAt(mockExpiresAt);
      }

      setPhase('questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
      setPhase('error');
    }
  };

  // Start assessment
  const handleStart = async () => {
    if (!personId) {
      setError('Missing person identifier. Please use the link from your email.');
      setPhase('error');
      return;
    }

    try {
      const response = await fetch(`/api/assess/${slug}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, applicationId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start assessment');
      }

      const data = await response.json();

      setSessionId(data.session.id);
      setQuestions(data.questions);
      setPersonName(`${data.person.firstName} ${data.person.lastName}`);
      setDebugMode(false);

      // Restore existing answers if resuming
      if (data.existingResponses) {
        const restored = new Map<string, AnswerData>();
        for (const r of data.existingResponses) {
          restored.set(r.questionId, r.answer);
        }
        setAnswers(restored);
      }

      if (data.session.expiresAt) {
        setExpiresAt(new Date(data.session.expiresAt));
      }

      setPhase('questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assessment');
      setPhase('error');
    }
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, answer: AnswerData) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, answer);
    setAnswers(newAnswers);

    // Auto-save to server (skip in debug mode)
    if (sessionId && !debugMode) {
      fetch(`/api/assess/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          responses: [{ questionId, answer }],
          action: 'save',
        }),
      }).catch(console.error);
    }
  };

  // Submit assessment
  const handleSubmit = async () => {
    if (!sessionId) return;

    // In debug mode, show a mock result instead of submitting
    if (debugMode) {
      setPhase('submitting');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a mock result
      const mockResult: SessionResult = {
        passed: true,
        score: Math.floor(answers.size * 0.8),
        maxScore: questions.length,
        percentage: Math.floor((answers.size / questions.length) * 80),
        passingScore: Math.floor(questions.length * 0.6),
        completedAt: new Date(),
      };
      
      setResult(mockResult);
      setPhase('results');
      return;
    }

    setPhase('submitting');

    try {
      const responses = Array.from(answers.entries()).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const response = await fetch(`/api/assess/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          responses,
          action: 'submit',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit assessment');
      }

      const data = await response.json();
      setResult(data.result);
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
      setPhase('error');
    }
  };

  // Force pass (DEBUG)
  const handleForcePass = async () => {
    if (!sessionId) return;

    setIsForcingPass(true);
    try {
      const response = await fetch(`/api/assess/${slug}/force-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to force pass');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      console.error('Error forcing pass:', err);
    } finally {
      setIsForcingPass(false);
    }
  };

  // Current question
  const currentQuestion = questions[currentIndex];

  // Progress
  const answeredCount = answers.size;
  const requiredCount = questions.filter((q) => q.required).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Can submit?
  const canSubmit = questions
    .filter((q) => q.required)
    .every((q) => answers.has(q.id));

  // Render intro phase
  if (phase === 'intro') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{template.name}</CardTitle>
          {template.description && (
            <CardDescription className="text-base">{template.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {template.headerText && (
            <div className="prose prose-sm max-w-none text-muted-foreground">
              {template.headerText}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{template.questionsCount} questions</span>
            </div>
            {template.timeLimit && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>{template.timeLimit} minutes</span>
              </div>
            )}
          </div>

          {!personId && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p className="text-sm font-medium">
                Missing identification. Please use the link from your email invitation.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleStart}
              disabled={!personId}
              className="w-full"
              size="lg"
            >
              Start Assessment
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>

            {!personId && (
              <Button
                onClick={handleDebugStart}
                variant="outline"
                className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                size="lg"
              >
                [DEBUG] Show Debug Form
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error phase
  if (phase === 'error') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render submitting phase
  if (phase === 'submitting') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Submitting your answers...</h2>
          <p className="text-muted-foreground">Please wait while we calculate your results.</p>
        </CardContent>
      </Card>
    );
  }

  // Render results phase
  if (phase === 'results' && result) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          {result.passed ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold mb-2">
            {result.passed ? 'Congratulations!' : 'Assessment Complete'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {result.passed
              ? 'You have successfully passed this assessment.'
              : 'Unfortunately, you did not meet the passing score.'}
          </p>

          <div className="bg-muted rounded-lg p-6 space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Your Score</span>
              <span className="text-2xl font-bold">
                {result.score}/{result.maxScore}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Percentage</span>
              <span className="text-2xl font-bold">{result.percentage}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Passing Score</span>
              <span className="text-lg">{result.passingScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Result</span>
              <Badge variant={result.passed ? 'default' : 'destructive'} className="text-sm">
                {result.passed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>
          </div>

          {/* Debug Force Pass Button (only in non-debug mode) */}
          {!result.passed && !debugMode && (
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={handleForcePass}
                disabled={isForcingPass}
                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
              >
                {isForcingPass ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Forcing Pass...
                  </>
                ) : (
                  '[DEBUG] Force Pass'
                )}
              </Button>
            </div>
          )}

          {template.footerText && (
            <p className="text-sm text-muted-foreground">{template.footerText}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render questions phase
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{template.name}</h1>
          <p className="text-sm text-muted-foreground">
            {personName}
            {debugMode && (
              <Badge variant="outline" className="ml-2 border-amber-500 text-amber-600">
                DEBUG MODE
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fillAllAnswers}
            className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs"
          >
            [DEBUG] Fill All
          </Button>
          {timeRemaining !== null && (
            <Badge variant={timeRemaining < 60 ? 'destructive' : 'secondary'} className="gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timeRemaining)}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>
            {answeredCount} answered
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">
                {currentQuestion.text}
              </CardTitle>
              {currentQuestion.required && (
                <Badge variant="outline" className="ml-2">Required</Badge>
              )}
            </div>
            {currentQuestion.helpText && (
              <CardDescription>{currentQuestion.helpText}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <QuestionInput
              question={currentQuestion}
              value={answers.get(currentQuestion.id)}
              onChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
            />
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex(currentIndex + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Assessment
          </Button>
        )}
      </div>

      {/* Question Nav */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-2">
            {questions.map((q, i) => (
              <Button
                key={q.id}
                variant={i === currentIndex ? 'default' : answers.has(q.id) ? 'secondary' : 'outline'}
                size="sm"
                className="w-10 h-10"
                onClick={() => setCurrentIndex(i)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Question Input Component
interface QuestionInputProps {
  question: PublicQuestion;
  value?: AnswerData;
  onChange: (answer: AnswerData) => void;
}

function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.type) {
    case 'MULTIPLE_CHOICE': {
      const options = question.options as { id: string; text: string }[];
      const selectedId = value?.type === 'MULTIPLE_CHOICE' ? value.selectedOptionId : undefined;

      return (
        <RadioGroup
          value={selectedId}
          onValueChange={(id) => onChange({ type: 'MULTIPLE_CHOICE', selectedOptionId: id })}
        >
          <div className="space-y-3">
            {options.map((opt) => (
              <div key={opt.id} className="flex items-center space-x-3">
                <RadioGroupItem value={opt.id} id={opt.id} />
                <Label htmlFor={opt.id} className="cursor-pointer">
                  {opt.text}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      );
    }

    case 'MULTIPLE_SELECT': {
      const options = question.options as { id: string; text: string }[];
      const selectedIds = value?.type === 'MULTIPLE_SELECT' ? value.selectedOptionIds : [];

      return (
        <div className="space-y-3">
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center space-x-3">
              <Checkbox
                id={opt.id}
                checked={selectedIds.includes(opt.id)}
                onCheckedChange={(checked) => {
                  const newIds = checked
                    ? [...selectedIds, opt.id]
                    : selectedIds.filter((id) => id !== opt.id);
                  onChange({ type: 'MULTIPLE_SELECT', selectedOptionIds: newIds });
                }}
              />
              <Label htmlFor={opt.id} className="cursor-pointer">
                {opt.text}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case 'TRUE_FALSE': {
      const currentValue = value?.type === 'TRUE_FALSE' ? value.value : undefined;
      const opts = question.options as { trueLabel?: string; falseLabel?: string } | undefined;

      return (
        <RadioGroup
          value={currentValue === undefined ? undefined : currentValue.toString()}
          onValueChange={(v) => onChange({ type: 'TRUE_FALSE', value: v === 'true' })}
        >
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="cursor-pointer">
                {opts?.trueLabel || 'True'}
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="cursor-pointer">
                {opts?.falseLabel || 'False'}
              </Label>
            </div>
          </div>
        </RadioGroup>
      );
    }

    case 'LIKERT_SCALE': {
      const config = question.options as { minLabel: string; maxLabel: string };
      const currentValue = value?.type === 'LIKERT_SCALE' ? value.value : undefined;

      return (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{config?.minLabel || 'Strongly Disagree'}</span>
            <span>{config?.maxLabel || 'Strongly Agree'}</span>
          </div>
          <RadioGroup
            value={currentValue?.toString()}
            onValueChange={(v) => onChange({ type: 'LIKERT_SCALE', value: parseInt(v) })}
          >
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex flex-col items-center gap-2">
                  <RadioGroupItem value={n.toString()} id={`likert-${n}`} />
                  <Label htmlFor={`likert-${n}`} className="cursor-pointer text-sm">
                    {n}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      );
    }

    case 'RATING': {
      const config = question.options as { minLabel: string; maxLabel: string };
      const currentValue = value?.type === 'RATING' ? value.value : undefined;

      return (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{config?.minLabel || '1'}</span>
            <span>{config?.maxLabel || '10'}</span>
          </div>
          <RadioGroup
            value={currentValue?.toString()}
            onValueChange={(v) => onChange({ type: 'RATING', value: parseInt(v) })}
          >
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <RadioGroupItem value={n.toString()} id={`rating-${n}`} />
                  <Label htmlFor={`rating-${n}`} className="cursor-pointer text-xs">
                    {n}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      );
    }

    case 'TEXT': {
      const currentValue = value?.type === 'TEXT' ? value.value : '';

      return (
        <Textarea
          value={currentValue}
          onChange={(e) => onChange({ type: 'TEXT', value: e.target.value })}
          placeholder="Type your answer here..."
          rows={4}
        />
      );
    }

    default:
      return <p className="text-muted-foreground">Unsupported question type</p>;
  }
}
