'use client';

/**
 * New Questionnaire Page Client Component
 *
 * Questionnaire builder for creating new questionnaire templates.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { QuestionInput } from '@/types/questionnaire';
import { QuestionType } from '@/lib/types/firestore';

const questionTypeLabels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_SELECT: 'Multiple Select',
  LIKERT_SCALE: 'Likert Scale (1-5)',
  TRUE_FALSE: 'True/False',
  TEXT: 'Free Text',
  RATING: 'Rating (1-10)',
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export function NewQuestionnairePageClient() {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [headerText, setHeaderText] = React.useState('');
  const [footerText, setFooterText] = React.useState('');
  const [questions, setQuestions] = React.useState<QuestionInput[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = React.useState<string | null>(null);

  // Auto-generate slug from name
  React.useEffect(() => {
    if (name && !slug) {
      setSlug(generateSlug(name));
    }
  }, [name, slug]);

  // Add new question
  const addQuestion = (questionType: QuestionType = 'MULTIPLE_CHOICE') => {
    const newId = `q-${Date.now()}`;
    const newQuestion: QuestionInput = {
      id: newId,
      order: questions.length + 1,
      type: questionType,
      text: '',
      required: true,
      options:
        questionType === 'MULTIPLE_CHOICE' || questionType === 'MULTIPLE_SELECT'
          ? [
              { id: `opt-${Date.now()}-1`, text: 'Option 1' },
              { id: `opt-${Date.now()}-2`, text: 'Option 2' },
            ]
          : questionType === 'TRUE_FALSE'
          ? { trueLabel: 'True', falseLabel: 'False' }
          : questionType === 'LIKERT_SCALE'
          ? { minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' }
          : questionType === 'RATING'
          ? { minLabel: 'Poor', maxLabel: 'Excellent', minValue: 1, maxValue: 10 }
          : undefined,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestionId(newId);
  };

  // Update question
  const updateQuestion = (id: string, updates: Partial<QuestionInput>) => {
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

    const newOption = {
      id: `opt-${Date.now()}`,
      text: `Option ${(question.options as { id: string; text: string }[]).length + 1}`,
    };

    updateQuestion(questionId, {
      options: [...(question.options as { id: string; text: string }[]), newOption],
    });
  };

  // Update option
  const updateOption = (questionId: string, optionId: string, text: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !Array.isArray(question.options)) return;

    const newOptions = (question.options as { id: string; text: string }[]).map((o) =>
      o.id === optionId ? { ...o, text } : o
    );
    updateQuestion(questionId, { options: newOptions });
  };

  // Remove option
  const removeOption = (questionId: string, optionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !Array.isArray(question.options)) return;

    const newOptions = (question.options as { id: string; text: string }[]).filter(
      (o) => o.id !== optionId
    );
    if (newOptions.length < 2) {
      toast({ title: 'Error', description: 'At least 2 options required', variant: 'destructive' });
      return;
    }
    updateQuestion(questionId, { options: newOptions });
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    if (questions.length === 0) {
      toast({ title: 'Error', description: 'At least one question is required', variant: 'destructive' });
      return;
    }

    // Validate all questions
    for (const q of questions) {
      if (!q.text.trim()) {
        toast({ title: 'Error', description: 'All questions must have text', variant: 'destructive' });
        return;
      }

      if ((q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_SELECT') && Array.isArray(q.options)) {
        if (q.options.length < 2) {
          toast({
            title: 'Error',
            description: 'Multiple choice questions must have at least 2 options',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || generateSlug(name),
          description,
          headerText,
          footerText,
          isActive: true,
          questions: questions.map((q) => ({
            order: q.order,
            type: q.type,
            text: q.text,
            helpText: q.helpText,
            required: q.required ?? true,
            options: q.options,
            section: q.section,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create questionnaire');
      }

      const result = await response.json();
      toast({ title: 'Success', description: 'Questionnaire created successfully' });
      router.push(`/questionnaires/${result.questionnaire.id}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create questionnaire',
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Questionnaire</h1>
          <p className="text-muted-foreground">Build a workspace assessment questionnaire</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Set up the questionnaire name and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Workspace Ergonomic Assessment"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Auto-generated from name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the questionnaire"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headerText">Header Text</Label>
            <Textarea
              id="headerText"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Text shown at the top of the questionnaire"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerText">Footer Text</Label>
            <Textarea
              id="footerText"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Text shown at the bottom of the questionnaire"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>Add and configure questions for the questionnaire</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select onValueChange={(value) => addQuestion(value as QuestionType)}>
                <SelectTrigger className="w-[200px]">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No questions yet. Add your first question to get started.</p>
            </div>
          ) : (
            questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                isExpanded={expandedQuestionId === question.id}
                onExpand={() => setExpandedQuestionId(question.id)}
                onCollapse={() => setExpandedQuestionId(null)}
                onUpdate={(updates) => updateQuestion(question.id, updates)}
                onRemove={() => removeQuestion(question.id)}
                onMoveUp={() => moveQuestion(index, 'up')}
                onMoveDown={() => moveQuestion(index, 'down')}
                onAddOption={() => addOption(question.id)}
                onUpdateOption={(optionId, text) => updateOption(question.id, optionId, text)}
                onRemoveOption={(optionId) => removeOption(question.id, optionId)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Creating...' : 'Create Questionnaire'}
        </Button>
      </div>
    </div>
  );
}

// Question Editor Component
interface QuestionEditorProps {
  question: QuestionInput;
  index: number;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onUpdate: (updates: Partial<QuestionInput>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddOption: () => void;
  onUpdateOption: (optionId: string, text: string) => void;
  onRemoveOption: (optionId: string) => void;
}

function QuestionEditor({
  question,
  index,
  isExpanded,
  onExpand,
  onCollapse,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: QuestionEditorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Question {index + 1}</span>
            <span className="text-xs text-muted-foreground">
              ({questionTypeLabels[question.type]})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={index === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveDown}
              disabled={false}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={isExpanded ? onCollapse : onExpand}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Question Text *</Label>
            <Textarea
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Enter your question"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Help Text</Label>
            <Input
              value={question.helpText || ''}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
              placeholder="Optional help text for the question"
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Input
              value={question.section || ''}
              onChange={(e) => onUpdate({ section: e.target.value })}
              placeholder="Optional section name"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={question.required ?? true}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
            />
            <Label>Required</Label>
          </div>

          {/* Options for choice questions */}
          {(question.type === 'MULTIPLE_CHOICE' || question.type === 'MULTIPLE_SELECT') &&
            Array.isArray(question.options) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button variant="outline" size="sm" onClick={onAddOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {(question.options as { id: string; text: string }[]).map((option, optIndex) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Input
                        value={option.text}
                        onChange={(e) => onUpdateOption(option.id, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveOption(option.id)}
                        disabled={(question.options as { id: string; text: string }[]).length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      )}
    </Card>
  );
}
