'use client';

/**
 * New Form Page Client Component
 *
 * Form builder for creating new application forms.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
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
import {
  formTemplates,
  fieldTypeLabels,
  generateSlug,
} from '@/config/form-templates';
import { recruitment, strings } from '@/config';
import type { FormField, FormTemplate } from '@/types/form';

type FieldType = FormField['type'];

export function NewFormPageClient() {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [position, setPosition] = React.useState('');
  const [headerText, setHeaderText] = React.useState('');
  const [footerText, setFooterText] = React.useState('');
  const [isTemplate, setIsTemplate] = React.useState(false);
  const [fields, setFields] = React.useState<FormField[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
  const [expandedFieldId, setExpandedFieldId] = React.useState<string | null>(null);

  // Auto-generate slug from name
  React.useEffect(() => {
    if (name && !slug) {
      setSlug(generateSlug(name));
    }
  }, [name, slug]);

  // Apply template
  const applyTemplate = (templateId: string) => {
    const template = formTemplates.find((t) => t.id === templateId);
    if (template) {
      setFields(template.fields.map((f) => ({ ...f, id: `${f.id}-${Date.now()}` })));
      setHeaderText(template.headerText || '');
      setFooterText(template.footerText || '');
      setSelectedTemplate(templateId);
    }
  };

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
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || generateSlug(name),
          description,
          position,
          isTemplate,
          fields,
          headerText,
          footerText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create form');
      }

      const { form } = await response.json();
      toast({ title: 'Form created successfully' });
      router.push(`/forms/${form.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create form';
      toast({ title: 'Error', description: message, variant: 'destructive' });
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
          <h1 className="text-2xl font-bold tracking-tight">Create New Form</h1>
          <p className="text-muted-foreground">
            Create an application form from a template or build your own
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Creating...' : 'Create Form'}
        </Button>
      </div>

      <Tabs defaultValue="template" className="space-y-6">
        <TabsList>
          <TabsTrigger value="template">Start from Template</TabsTrigger>
          <TabsTrigger value="custom">Build Custom</TabsTrigger>
        </TabsList>

        {/* Template Selection */}
        <TabsContent value="template" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{strings.applicationForms.selectTemplate}</CardTitle>
              <CardDescription>
                {strings.applicationForms.templateDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {formTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors hover:border-primary ${
                      selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => applyTemplate(template.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {template.fields.length} fields
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Form Builder */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Start Fresh</CardTitle>
              <CardDescription>
                Build your form from scratch by adding fields below
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

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

          <div className="flex items-center space-x-2">
            <Switch id="isTemplate" checked={isTemplate} onCheckedChange={setIsTemplate} />
            <Label htmlFor="isTemplate">Save as reusable template</Label>
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
              <p>No fields yet. Add a field or select a template above.</p>
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
