'use client';

/**
 * Edit Assessment Page Client Component
 *
 * Edit an existing assessment template.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { recruitment, defaultGCTemplate } from '@/config';
import type { AssessmentTemplateWithQuestions, AssessmentQuestionInput, QuestionOption } from '@/types/assessment';
import type { QuestionType, AssessmentTemplateType } from '@/lib/generated/prisma/client';

const questionTypeLabels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_SELECT: 'Multiple Select',
  LIKERT_SCALE: 'Likert Scale (1-5)',
  TRUE_FALSE: 'True/False',
  TEXT: 'Free Text',
  RATING: 'Rating (1-10)',
};

interface EditAssessmentPageClientProps {
  template: AssessmentTemplateWithQuestions;
}

export function EditAssessmentPageClient({ template }: EditAssessmentPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state - initialize from template
  const [name, setName] = React.useState(template.name);
  const [slug, setSlug] = React.useState(template.slug);
  const [description, setDescription] = React.useState(template.description || '');
  const [type, setType] = React.useState<AssessmentTemplateType>(template.type);
  const [position, setPosition] = React.useState<string>(template.position || '');
  const [passingScore, setPassingScore] = React.useState(template.passingScore);
  const [timeLimit, setTimeLimit] = React.useState<number | undefined>(template.timeLimit || undefined);
  const [headerText, setHeaderText] = React.useState(template.headerText || '');
  const [footerText, setFooterText] = React.useState(template.footerText || '');
  const [isActive, setIsActive] = React.useState(template.isActive);
  const [questions, setQuestions] = React.useState<AssessmentQuestionInput[]>(
    template.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      text: q.text,
      helpText: q.helpText || undefined,
      required: q.required,
      points: q.points,
      options: q.options as QuestionOption[] | Record<string, unknown> | undefined,
      section: q.section || undefined,
    }))
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = React.useState<string | null>(null);

  // Calculate max score
  const maxScore = React.useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0);
  }, [questions]);

  // Add new question
  const addQuestion = (questionType: QuestionType = 'MULTIPLE_CHOICE') => {
    const newId = `q-new-${Date.now()}`;
    const newQuestion: AssessmentQuestionInput = {
      id: newId,
      order: questions.length + 1,
      type: questionType,
      text: '',
      points: 10,
      required: true,
      options:
        questionType === 'MULTIPLE_CHOICE' || questionType === 'MULTIPLE_SELECT'
          ? [
              { id: `opt-${Date.now()}-1`, text: 'Option 1', points: 10 },
              { id: `opt-${Date.now()}-2`, text: 'Option 2', points: 0 },
            ]
          : questionType === 'TRUE_FALSE'
          ? { correctAnswer: true, trueLabel: 'True', falseLabel: 'False' }
          : questionType === 'LIKERT_SCALE'
          ? { minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree', pointsMapping: [0, 25, 50, 75, 100] }
          : questionType === 'RATING'
          ? { minLabel: 'Poor', maxLabel: 'Excellent', minValue: 1, maxValue: 10, pointsPerUnit: 10 }
          : undefined,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestionId(newId);
  };

  // Update question
  const updateQuestion = (id: string, updates: Partial<AssessmentQuestionInput>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  // Remove question
  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i + 1 })));
    if (expandedQuestionId === id) {
      setExpandedQuestionId(null);
    }
  };

  // Move question up/down
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i + 1 })));
  };

  // Add option to choice question
  const addOption = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !Array.isArray(question.options)) return;

    const newOption: QuestionOption = {
      id: `opt-${Date.now()}`,
      text: `Option ${(question.options as QuestionOption[]).length + 1}`,
      points: 0,
    };

    updateQuestion(questionId, {
      options: [...(question.options as QuestionOption[]), newOption],
    });
  };

  // Update option
  const updateOption = (questionId: string, optionId: string, updates: Partial<QuestionOption>) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !Array.isArray(question.options)) return;

    const newOptions = (question.options as QuestionOption[]).map((o) =>
      o.id === optionId ? { ...o, ...updates } : o
    );
    updateQuestion(questionId, { options: newOptions });
  };

  // Remove option
  const removeOption = (questionId: string, optionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !Array.isArray(question.options)) return;

    const newOptions = (question.options as QuestionOption[]).filter((o) => o.id !== optionId);
    if (newOptions.length < 2) {
      toast({ title: 'Error', description: 'At least 2 options required', variant: 'destructive' });
      return;
    }
    updateQuestion(questionId, { options: newOptions });
  };

  // Generate slug helper
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  // Fill sample data (DEBUG)
  const fillSampleData = () => {
    if (type === 'GENERAL_COMPETENCIES') {
      // Use default GC template data
      setName(defaultGCTemplate.name);
      setSlug(defaultGCTemplate.slug);
      setDescription(defaultGCTemplate.description);
      setType('GENERAL_COMPETENCIES');
      setPosition('');
      setPassingScore(defaultGCTemplate.passingScore);
      setTimeLimit(defaultGCTemplate.timeLimit);
      setHeaderText(defaultGCTemplate.headerText || '');
      setFooterText(defaultGCTemplate.footerText || '');
      
      // Add questions with unique IDs
      const sampleQuestions: AssessmentQuestionInput[] = defaultGCTemplate.questions.map((q, index) => ({
        id: `q-sample-${Date.now()}-${index}`,
        order: q.order,
        type: q.type,
        text: q.text,
        helpText: q.helpText,
        required: q.required,
        points: q.points,
        options: q.options,
        section: q.section,
      }));
      
      setQuestions(sampleQuestions);
      
      toast({
        title: 'Sample Data Filled',
        description: `Filled ${sampleQuestions.length} questions from default GC template`,
      });
    } else {
      // Sample SC template data
      const samplePosition = recruitment.positions[0] || 'Software Developer';
      setName(`Specialized Competencies - ${samplePosition}`);
      setSlug(generateSlug(`specialized-competencies-${samplePosition.toLowerCase().replace(/\s+/g, '-')}`));
      setDescription('Evaluates role-specific technical skills and competencies required for this position.');
      setType('SPECIALIZED_COMPETENCIES');
      setPosition(samplePosition);
      setPassingScore(75);
      setTimeLimit(45);
      setHeaderText('This assessment evaluates your technical skills and knowledge specific to this role. Please answer all questions to the best of your ability.');
      setFooterText('Thank you for completing this assessment. Your responses will be reviewed by our technical team.');
      
      // Sample SC questions
      const sampleQuestions: AssessmentQuestionInput[] = [
        {
          id: `q-sample-${Date.now()}-1`,
          order: 1,
          type: 'MULTIPLE_CHOICE',
          text: 'Which programming language are you most proficient in?',
          helpText: 'Select the language you have the most experience with.',
          required: true,
          points: 15,
          section: 'Technical Skills',
          options: [
            { id: 'sc1-a', text: 'JavaScript/TypeScript', points: 15 },
            { id: 'sc1-b', text: 'Python', points: 15 },
            { id: 'sc1-c', text: 'Java', points: 12 },
            { id: 'sc1-d', text: 'C++', points: 10 },
            { id: 'sc1-e', text: 'Other', points: 8 },
          ],
        },
        {
          id: `q-sample-${Date.now()}-2`,
          order: 2,
          type: 'MULTIPLE_SELECT',
          text: 'Which technologies have you worked with? (Select all that apply)',
          helpText: 'Select all technologies you have hands-on experience with.',
          required: true,
          points: 20,
          section: 'Technical Skills',
          options: [
            { id: 'sc2-a', text: 'React', points: 5 },
            { id: 'sc2-b', text: 'Node.js', points: 5 },
            { id: 'sc2-c', text: 'PostgreSQL', points: 4 },
            { id: 'sc2-d', text: 'AWS', points: 3 },
            { id: 'sc2-e', text: 'Docker', points: 3 },
          ],
        },
        {
          id: `q-sample-${Date.now()}-3`,
          order: 3,
          type: 'LIKERT_SCALE',
          text: 'I am comfortable working with complex algorithms and data structures.',
          required: true,
          points: 15,
          section: 'Technical Skills',
          options: {
            minLabel: 'Strongly Disagree',
            maxLabel: 'Strongly Agree',
            pointsMapping: [0, 3, 7, 12, 15],
          },
        },
        {
          id: `q-sample-${Date.now()}-4`,
          order: 4,
          type: 'RATING',
          text: 'Rate your experience level with version control systems (Git)',
          helpText: '1 = Beginner, 10 = Expert',
          required: true,
          points: 10,
          section: 'Technical Skills',
          options: {
            minLabel: 'Beginner',
            maxLabel: 'Expert',
            minValue: 1,
            maxValue: 10,
            pointsPerUnit: 1,
          },
        },
        {
          id: `q-sample-${Date.now()}-5`,
          order: 5,
          type: 'TRUE_FALSE',
          text: 'I have experience with automated testing frameworks.',
          required: true,
          points: 10,
          section: 'Technical Skills',
          options: {
            correctAnswer: true,
            trueLabel: 'Yes',
            falseLabel: 'No',
          },
        },
        {
          id: `q-sample-${Date.now()}-6`,
          order: 6,
          type: 'TEXT',
          text: 'Describe a challenging technical problem you solved recently.',
          helpText: 'Provide a brief description (2-3 sentences)',
          required: false,
          points: 10,
          section: 'Problem Solving',
        },
      ];
      
      setQuestions(sampleQuestions);
      
      toast({
        title: 'Sample Data Filled',
        description: `Filled ${sampleQuestions.length} sample SC questions`,
      });
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Assessment name is required', variant: 'destructive' });
      return;
    }

    if (type === 'SPECIALIZED_COMPETENCIES' && !position) {
      toast({ title: 'Error', description: 'Position is required for specialized assessments', variant: 'destructive' });
      return;
    }

    if (questions.length === 0) {
      toast({ title: 'Error', description: 'At least one question is required', variant: 'destructive' });
      return;
    }

    const invalidQuestions = questions.filter((q) => !q.text.trim());
    if (invalidQuestions.length > 0) {
      toast({ title: 'Error', description: 'All questions must have text', variant: 'destructive' });
      return;
    }

    if (passingScore > maxScore) {
      toast({ title: 'Error', description: 'Passing score cannot exceed max score', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/assessments/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          type,
          position: type === 'SPECIALIZED_COMPETENCIES' ? position : null,
          passingScore,
          timeLimit: timeLimit || null,
          headerText,
          footerText,
          isActive,
          questions: questions.map(({ id, ...q }) => q),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update assessment');
      }

      toast({ title: 'Assessment updated successfully' });
      router.push('/assessments');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update assessment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Edit Assessment</h1>
          <p className="text-muted-foreground">Update {template.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Active</Label>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fillSampleData}
            className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
          >
            [DEBUG Flag] | Fill Sample Data
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({questions.length})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
              <CardDescription>Configure the basic settings for this assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Assessment Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., General Competencies Assessment"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated from name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this assessment evaluates..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Assessment Type *</Label>
                  <Select value={type} onValueChange={(v) => setType(v as AssessmentTemplateType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL_COMPETENCIES">General Competencies</SelectItem>
                      <SelectItem value="SPECIALIZED_COMPETENCIES">Specialized Competencies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {type === 'SPECIALIZED_COMPETENCIES' && (
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {recruitment.positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passingScore">Passing Score *</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Score</Label>
                  <div className="flex items-center h-10 px-3 border rounded-md bg-muted text-muted-foreground">
                    {maxScore}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    value={timeLimit || ''}
                    onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                    min={0}
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headerText">Header Text</Label>
                <Textarea
                  id="headerText"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Instructions shown at the top of the assessment..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">Footer Text</Label>
                <Textarea
                  id="footerText"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Text shown at the bottom..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab - Same as new page */}
        <TabsContent value="questions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Questions</h2>
              <p className="text-sm text-muted-foreground">
                Total: {questions.length} questions, {maxScore} points
              </p>
            </div>
            <Select onValueChange={(v) => addQuestion(v as QuestionType)}>
              <SelectTrigger className="w-[200px]">
                <Plus className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Add Question" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(questionTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {questions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No questions yet</p>
                <Button onClick={() => addQuestion()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <Card key={question.id} className="overflow-hidden">
                  <div
                    className="flex items-center gap-2 p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedQuestionId(
                        expandedQuestionId === question.id ? null : question.id!
                      )
                    }
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium w-8">{index + 1}.</span>
                    <span className="flex-1 truncate">
                      {question.text || 'Untitled question'}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {questionTypeLabels[question.type]}
                    </Badge>
                    <Badge variant="secondary">{question.points} pts</Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveQuestion(index, 'up');
                        }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveQuestion(index, 'down');
                        }}
                        disabled={index === questions.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuestion(question.id!);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedQuestionId === question.id && (
                    <CardContent className="border-t space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Question Text *</Label>
                        <Textarea
                          value={question.text}
                          onChange={(e) => updateQuestion(question.id!, { text: e.target.value })}
                          placeholder="Enter the question..."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Points *</Label>
                          <Input
                            type="number"
                            value={question.points}
                            onChange={(e) =>
                              updateQuestion(question.id!, { points: parseInt(e.target.value) || 0 })
                            }
                            min={0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Section (optional)</Label>
                          <Input
                            value={question.section || ''}
                            onChange={(e) => updateQuestion(question.id!, { section: e.target.value })}
                            placeholder="e.g., Communication Skills"
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            checked={question.required}
                            onCheckedChange={(checked) =>
                              updateQuestion(question.id!, { required: checked })
                            }
                          />
                          <Label>Required</Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Help Text (optional)</Label>
                        <Input
                          value={question.helpText || ''}
                          onChange={(e) => updateQuestion(question.id!, { helpText: e.target.value })}
                          placeholder="Additional instructions for this question"
                        />
                      </div>

                      {/* Options for choice questions */}
                      {(question.type === 'MULTIPLE_CHOICE' || question.type === 'MULTIPLE_SELECT') &&
                        Array.isArray(question.options) && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Options</Label>
                              <Button variant="outline" size="sm" onClick={() => addOption(question.id!)}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {(question.options as QuestionOption[]).map((opt) => (
                                <div key={opt.id} className="flex items-center gap-2">
                                  <Input
                                    value={opt.text}
                                    onChange={(e) =>
                                      updateOption(question.id!, opt.id, { text: e.target.value })
                                    }
                                    placeholder="Option text"
                                    className="flex-1"
                                  />
                                  <Input
                                    type="number"
                                    value={opt.points}
                                    onChange={(e) =>
                                      updateOption(question.id!, opt.id, {
                                        points: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    className="w-20"
                                    placeholder="Points"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeOption(question.id!, opt.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* True/False options */}
                      {question.type === 'TRUE_FALSE' && (
                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <Select
                            value={
                              (question.options as { correctAnswer: boolean })?.correctAnswer
                                ? 'true'
                                : 'false'
                            }
                            onValueChange={(v) =>
                              updateQuestion(question.id!, {
                                options: { ...question.options, correctAnswer: v === 'true' },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Likert scale config */}
                      {question.type === 'LIKERT_SCALE' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Min Label (1)</Label>
                            <Input
                              value={(question.options as { minLabel: string })?.minLabel || ''}
                              onChange={(e) =>
                                updateQuestion(question.id!, {
                                  options: { ...question.options, minLabel: e.target.value },
                                })
                              }
                              placeholder="Strongly Disagree"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Label (5)</Label>
                            <Input
                              value={(question.options as { maxLabel: string })?.maxLabel || ''}
                              onChange={(e) =>
                                updateQuestion(question.id!, {
                                  options: { ...question.options, maxLabel: e.target.value },
                                })
                              }
                              placeholder="Strongly Agree"
                            />
                          </div>
                        </div>
                      )}

                      {/* Rating config */}
                      {question.type === 'RATING' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Min Label</Label>
                            <Input
                              value={(question.options as { minLabel: string })?.minLabel || ''}
                              onChange={(e) =>
                                updateQuestion(question.id!, {
                                  options: { ...question.options, minLabel: e.target.value },
                                })
                              }
                              placeholder="Poor"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Label</Label>
                            <Input
                              value={(question.options as { maxLabel: string })?.maxLabel || ''}
                              onChange={(e) =>
                                updateQuestion(question.id!, {
                                  options: { ...question.options, maxLabel: e.target.value },
                                })
                              }
                              placeholder="Excellent"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
