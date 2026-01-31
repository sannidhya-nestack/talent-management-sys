'use client';

/**
 * Edit Questionnaire Page Client Component
 *
 * Edit an existing questionnaire template.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { QuestionnaireWithQuestions } from '@/types/questionnaire';
import { NewQuestionnairePageClient } from '../../new/page-client';

interface EditQuestionnairePageClientProps {
  questionnaire: QuestionnaireWithQuestions;
}

export function EditQuestionnairePageClient({ questionnaire }: EditQuestionnairePageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Convert questionnaire to form data format
  const initialFormData = React.useMemo(() => ({
    name: questionnaire.name,
    slug: questionnaire.slug,
    description: questionnaire.description || '',
    headerText: questionnaire.headerText || '',
    footerText: questionnaire.footerText || '',
    questions: questionnaire.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      text: q.text,
      helpText: q.helpText || '',
      required: q.required,
      section: q.section || '',
      options: q.options,
    })),
  }), [questionnaire]);

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/questionnaires/${questionnaire.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          isActive: questionnaire.isActive,
          questions: formData.questions.map((q: any) => ({
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
        throw new Error(data.error || 'Failed to update questionnaire');
      }

      toast({ title: 'Success', description: 'Questionnaire updated successfully' });
      router.push(`/questionnaires/${questionnaire.id}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update questionnaire',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Questionnaire</h1>
          <p className="text-muted-foreground">Update questionnaire template</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questionnaire: {questionnaire.name}</CardTitle>
          <CardDescription>
            Make changes to the questionnaire template below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Full questionnaire editor coming soon. For now, you can view the questionnaire details.
          </p>
          <div className="space-y-2">
            <p><strong>Name:</strong> {questionnaire.name}</p>
            <p><strong>Description:</strong> {questionnaire.description || 'No description'}</p>
            <p><strong>Questions:</strong> {questionnaire.questions.length}</p>
            <p><strong>Status:</strong> {questionnaire.isActive ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/questionnaires/${questionnaire.id}/responses`)}>
              View Responses
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
