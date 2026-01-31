'use client';

/**
 * Questionnaire Page Client Component
 *
 * Handles the questionnaire taking experience:
 * 1. Info screen (before starting)
 * 2. Question navigation
 * 3. Answer submission
 * 4. Completion display
 */

import * as React from 'react';
import {
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
import type { PublicQuestionnaireData, PublicQuestion, AnswerData } from '@/types/questionnaire';

interface QuestionnairePageClientProps {
  questionnaire: PublicQuestionnaireData;
  questions: PublicQuestion[];
  slug: string;
}

type Phase = 'intro' | 'questions' | 'submitting' | 'completed' | 'error';

export function QuestionnairePageClient({
  questionnaire,
  questions,
  slug,
}: QuestionnairePageClientProps) {
  // State
  const [phase, setPhase] = React.useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Map<string, AnswerData>>(new Map());
  const [error, setError] = React.useState<string | null>(null);

  // Start questionnaire
  const handleStart = () => {
    setPhase('questions');
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, answer: AnswerData) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, answer);
    setAnswers(newAnswers);
  };

  // Submit questionnaire
  const handleSubmit = async () => {
    setPhase('submitting');

    try {
      // Validate required questions
      for (const question of questions) {
        if (question.required && !answers.has(question.id)) {
          setError(`Please answer question ${question.order}: ${question.text}`);
          setPhase('questions');
          setCurrentIndex(questions.findIndex((q) => q.id === question.id));
          return;
        }
      }

      const response = await fetch(`/api/questionnaires/${questionnaire.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: Array.from(answers.entries()).map(([questionId, answer]) => ({
            questionId,
            answer,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit questionnaire');
      }

      setPhase('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit questionnaire');
      setPhase('error');
    }
  };

  // Navigation
  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = answers.size;
  const requiredCount = questions.filter((q) => q.required).length;
  const requiredAnswered = questions.filter((q) => q.required && answers.has(q.id)).length;

  // Intro screen
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">{questionnaire.name}</CardTitle>
            {questionnaire.description && (
              <CardDescription className="text-base">{questionnaire.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {questionnaire.headerText && (
              <div className="prose max-w-none">
                <p className="text-muted-foreground">{questionnaire.headerText}</p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>{questions.length}</strong> questions
              </p>
              <p className="text-sm text-muted-foreground">
                Estimated time: {Math.ceil(questions.length * 2)} minutes
              </p>
            </div>
            <Button onClick={handleStart} className="w-full" size="lg">
              Start Questionnaire
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Questions screen
  if (phase === 'questions') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span>
                    {answeredCount} answered ({requiredAnswered}/{requiredCount} required)
                  </span>
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>

          {/* Question */}
          {currentQuestion && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {currentQuestion.order}. {currentQuestion.text}
                    </CardTitle>
                    {currentQuestion.helpText && (
                      <CardDescription className="mt-2">{currentQuestion.helpText}</CardDescription>
                    )}
                    {currentQuestion.required && (
                      <Badge variant="outline" className="mt-2">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
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

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Submitting screen
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Submitting your responses...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed screen
  if (phase === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription>Your questionnaire has been submitted successfully.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {questionnaire.footerText && (
              <div className="prose max-w-none text-center">
                <p className="text-muted-foreground">{questionnaire.footerText}</p>
              </div>
            )}
            <div className="text-center text-sm text-muted-foreground">
              <p>You answered {answeredCount} out of {questions.length} questions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <Button onClick={() => setPhase('questions')} className="mt-4">
            Try Again
          </Button>
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
        <RadioGroup value={selectedId} onValueChange={(id) => onChange({ type: 'MULTIPLE_CHOICE', selectedOptionId: id })}>
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

      return (
        <RadioGroup
          value={currentValue?.toString()}
          onValueChange={(v) => onChange({ type: 'TRUE_FALSE', value: v === 'true' })}
        >
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="cursor-pointer">True</Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="cursor-pointer">False</Label>
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
                <div key={n} className="flex flex-col items-center gap-1">
                  <RadioGroupItem value={n.toString()} id={`likert-${n}`} />
                  <Label htmlFor={`likert-${n}`} className="cursor-pointer text-xs">
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
