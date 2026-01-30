'use client';

/**
 * Public Form Page Client Component
 *
 * Renders the public application form for candidates to fill out.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { branding, strings } from '@/config';
import type { PublicFormData, FormField, FileUploadData } from '@/types/form';

interface PublicFormPageClientProps {
  form: PublicFormData;
}

export function PublicFormPageClient({ form }: PublicFormPageClientProps) {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = React.useState<Record<string, unknown>>({});
  const [files, setFiles] = React.useState<FileUploadData[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [uploadingField, setUploadingField] = React.useState<string | null>(null);

  // Update field value
  const updateField = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Debug: Fill all fields with sample data
  const fillAllFields = () => {
    const sampleData: Record<string, unknown> = {};

    form.fields.forEach((field) => {
      switch (field.type) {
        case 'text':
          // Use mapped field name or generate sample text
          if (field.mappedTo?.includes('firstName')) {
            sampleData[field.id] = 'John';
          } else if (field.mappedTo?.includes('lastName')) {
            sampleData[field.id] = 'Doe';
          } else if (field.label.toLowerCase().includes('name')) {
            sampleData[field.id] = 'John Doe';
          } else {
            sampleData[field.id] = 'Sample text';
          }
          break;

        case 'email':
          sampleData[field.id] = 'your.email@example.com';
          break;

        case 'phone':
          sampleData[field.id] = '+1 (555) 123-4567';
          break;

        case 'url':
          if (field.label.toLowerCase().includes('portfolio') || field.label.toLowerCase().includes('linkedin')) {
            sampleData[field.id] = 'https://linkedin.com/in/yourprofile';
          } else {
            sampleData[field.id] = 'https://example.com';
          }
          break;

        case 'textarea':
          if (field.mappedTo?.includes('academicBackground')) {
            sampleData[field.id] = 'Bachelor of Science in Computer Science from State University (2018-2022). Specialized in Software Engineering and Database Systems.';
          } else if (field.mappedTo?.includes('previousExperience')) {
            sampleData[field.id] = 'Software Engineer at Tech Solutions Inc. (2022-2024). Developed and maintained web applications using React, Node.js, and PostgreSQL. Collaborated with cross-functional teams to deliver 5+ major features.';
          } else {
            sampleData[field.id] = 'This is a sample text area response for testing purposes.';
          }
          break;

        case 'number':
          sampleData[field.id] = 5;
          break;

        case 'select':
          // Select first option if available
          if (field.options && field.options.length > 0) {
            sampleData[field.id] = field.options[0];
          }
          break;

        case 'checkbox':
          sampleData[field.id] = true;
          break;

        case 'checkboxGroup':
          // Select first option if available
          if (field.options && field.options.length > 0) {
            sampleData[field.id] = [field.options[0]];
          }
          break;

        default:
          // Use default value if provided
          if (field.defaultValue) {
            sampleData[field.id] = field.defaultValue;
          }
          break;
      }
    });

    setFormData(sampleData);
    // Clear all errors
    setErrors({});
  };

  // Handle file upload
  const handleFileUpload = async (fieldId: string, file: File) => {
    setUploadingField(fieldId);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fieldId', fieldId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { file: uploadedFile } = await response.json();

      setFiles((prev) => [...prev.filter((f) => f.fieldId !== fieldId), uploadedFile]);
      updateField(fieldId, uploadedFile.fileUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setErrors((prev) => ({ ...prev, [fieldId]: message }));
    } finally {
      setUploadingField(null);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of form.fields) {
      const value = formData[field.id];

      if (field.required) {
        if (value === undefined || value === null || value === '') {
          newErrors[field.id] = `${field.label} is required`;
        }
      }

      if (value && field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value as string)) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }

      if (value && field.type === 'url') {
        try {
          new URL(value as string);
        } catch {
          newErrors[field.id] = 'Please enter a valid URL';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/forms/submit/${form.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          files: files.length > 0 ? files : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.errors) {
          setErrors(result.errors);
        }
        throw new Error(result.message || 'Submission failed');
      }

      setIsSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission failed';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render field based on type
  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const error = errors[field.id];
    const uploadedFile = files.find((f) => f.fieldId === field.id);

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={isSubmitting}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={isSubmitting}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={isSubmitting}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => updateField(field.id, v)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => updateField(field.id, checked)}
              disabled={isSubmitting}
            />
            <span className="text-sm">{field.placeholder || field.label}</span>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept={field.validation?.accept}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(field.id, file);
                }}
                disabled={isSubmitting || uploadingField === field.id}
                className="flex-1"
              />
              {uploadingField === field.id && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>
            {uploadedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{uploadedFile.fileName}</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {strings.applicationForms.submissionSuccess}
            </h2>
            <p className="text-muted-foreground mb-6">
              {strings.applicationForms.submissionSuccessMessage}
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xl">
                {branding.organisationShortName.charAt(0)}
              </div>
            </div>
            <CardTitle className="text-2xl">{form.name}</CardTitle>
            <CardDescription>
              {form.description || `Application for ${form.position}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {form.headerText && (
              <p className="text-center text-muted-foreground mb-4">{form.headerText}</p>
            )}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillAllFields}
                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs"
              >
                [DEBUG] Fill All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Error banner */}
              {submitError && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Submission Error</p>
                    <p className="text-sm">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Form fields */}
              {form.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {renderField(field)}
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                  {errors[field.id] && (
                    <p className="text-sm text-destructive">{errors[field.id]}</p>
                  )}
                </div>
              ))}

              {/* Footer text */}
              {form.footerText && (
                <p className="text-sm text-muted-foreground text-center pt-4 border-t">
                  {form.footerText}
                </p>
              )}

              {/* Submit button */}
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {strings.applicationForms.processingSubmission}
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Branding footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by {branding.organisationName} {branding.appName}
        </p>
      </div>
    </div>
  );
}
