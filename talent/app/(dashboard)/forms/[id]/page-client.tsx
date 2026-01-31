'use client';

/**
 * Edit Form Page Client Component
 *
 * Edit an existing application form.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fieldTypeLabels, generateSlug } from '@/config/form-templates';
import { recruitment, strings } from '@/config';
import type { ApplicationForm, FormField } from '@/types/form';

type FieldType = FormField['type'];

interface EditFormPageClientProps {
  form: ApplicationForm;
}

export function EditFormPageClient({ form: initialForm }: EditFormPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [name, setName] = React.useState(initialForm.name);
  const [slug, setSlug] = React.useState(initialForm.slug);
  const [description, setDescription] = React.useState(initialForm.description || '');
  const [position, setPosition] = React.useState(initialForm.position);
  const [headerText, setHeaderText] = React.useState(initialForm.headerText || '');
  const [footerText, setFooterText] = React.useState(initialForm.footerText || '');
  const [isActive, setIsActive] = React.useState(initialForm.isActive);
  const [isTemplate, setIsTemplate] = React.useState(initialForm.isTemplate);
  const [fields, setFields] = React.useState<FormField[]>(initialForm.fields);

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedFieldId, setExpandedFieldId] = React.useState<string | null>(null);

  // Add new field
  const addField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
    };
    setFields([...fields, newField]);
    setExpandedFieldId(newField.id);
  };

  // Update field
  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  // Remove field
  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  // Move field up/down
  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  // Copy link
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/apply/${slug}`;
    await navigator.clipboard.writeText(url);
    toast({
      title: strings.applicationForms.linkCopied,
      description: url,
    });
  };

  // Submit form
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Form name is required', variant: 'destructive' });
      return;
    }

    if (!position) {
      toast({ title: 'Error', description: 'Position is required', variant: 'destructive' });
      return;
    }

    if (fields.length === 0) {
      toast({ title: 'Error', description: 'At least one field is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/forms/${initialForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          position,
          isActive,
          isTemplate,
          fields,
          headerText,
          footerText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update form');
      }

      toast({ title: 'Form updated successfully' });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update form';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/forms')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            {isTemplate && <Badge variant="outline">Template</Badge>}
          </div>
          <p className="text-muted-foreground">/forms/{slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/apply/${slug}`} target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/forms/${initialForm.id}/submissions`}>
              <Eye className="h-4 w-4 mr-2" />
              Submissions
            </Link>
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Form Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{strings.applicationForms.formSettings}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{strings.applicationForms.formName} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Software Developer Application"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{strings.applicationForms.formSlug}</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-from-name"
              />
              <p className="text-xs text-muted-foreground">
                URL: /apply/{slug || 'your-slug'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">{strings.applicationForms.formPosition} *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="description">{strings.applicationForms.formDescription}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the form and its purpose"
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="headerText">{strings.applicationForms.headerText}</Label>
              <Textarea
                id="headerText"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="Text shown at top of form"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerText">{strings.applicationForms.footerText}</Label>
              <Textarea
                id="footerText"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Text shown at bottom of form"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="isActive">Form is active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isTemplate" checked={isTemplate} onCheckedChange={setIsTemplate} />
              <Label htmlFor="isTemplate">Save as reusable template</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{strings.applicationForms.formFields}</CardTitle>
              <CardDescription>
                Configure the fields that applicants will fill out
              </CardDescription>
            </div>
            <Button onClick={addField} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {strings.applicationForms.addField}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fields yet. Add a field to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <span className="font-medium flex-1">{field.label}</span>
                      <Badge variant="outline">{fieldTypeLabels[field.type]}</Badge>
                      {field.required && (
                        <Badge variant="secondary">Required</Badge>
                      )}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveField(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveField(index, 'down')}
                          disabled={index === fields.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setExpandedFieldId(
                              expandedFieldId === field.id ? null : field.id
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedFieldId === field.id && (
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{strings.applicationForms.fieldLabel}</Label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              updateField(field.id, { label: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{strings.applicationForms.fieldType}</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value: FieldType) =>
                              updateField(field.id, { type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(fieldTypeLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{strings.applicationForms.fieldPlaceholder}</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) =>
                              updateField(field.id, { placeholder: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{strings.applicationForms.fieldHelpText}</Label>
                          <Input
                            value={field.helpText || ''}
                            onChange={(e) =>
                              updateField(field.id, { helpText: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {(field.type === 'select' || field.type === 'checkboxGroup') && (
                        <div className="space-y-2">
                          <Label>{strings.applicationForms.fieldOptions}</Label>
                          <Textarea
                            value={(field.options || []).join('\n')}
                            onChange={(e) =>
                              updateField(field.id, {
                                options: e.target.value.split('\n').filter(Boolean),
                              })
                            }
                            placeholder="One option per line"
                            rows={4}
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            updateField(field.id, { required: checked })
                          }
                        />
                        <Label>{strings.applicationForms.fieldRequired}</Label>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
