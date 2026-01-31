/**
 * Form Service
 *
 * CRUD operations for Application Forms.
 * Handles form creation, retrieval, updates, and deletion.
 */

import { db } from '@/lib/db';
import { generateSlug, isValidSlug } from '@/config/form-templates';
import type {
  ApplicationForm,
  ApplicationFormListItem,
  CreateFormData,
  UpdateFormData,
  FormField,
  PublicFormData,
  SlugValidation,
  FormStats,
} from '@/types/form';
import type { Prisma } from '@/lib/generated/prisma/client';

/**
 * Get all forms with pagination
 */
export async function getForms(options?: {
  page?: number;
  limit?: number;
  includeTemplates?: boolean;
  activeOnly?: boolean;
}): Promise<{ forms: ApplicationFormListItem[]; total: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.ApplicationFormWhereInput = {};

  if (options?.activeOnly) {
    where.isActive = true;
  }

  if (options?.includeTemplates === false) {
    where.isTemplate = false;
  }

  const [forms, total] = await Promise.all([
    db.applicationForm.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        position: true,
        isActive: true,
        isTemplate: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    }),
    db.applicationForm.count({ where }),
  ]);

  return { forms, total };
}

/**
 * Get a form by ID
 */
export async function getFormById(id: string): Promise<ApplicationForm | null> {
  const form = await db.applicationForm.findUnique({
    where: { id },
  });

  if (!form) return null;

  return {
    ...form,
    fields: form.fields as unknown as FormField[],
  };
}

/**
 * Get a form by slug (for public form page)
 */
export async function getFormBySlug(slug: string): Promise<PublicFormData | null> {
  const form = await db.applicationForm.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      position: true,
      fields: true,
      headerText: true,
      footerText: true,
    },
  });

  if (!form) return null;

  return {
    ...form,
    fields: form.fields as unknown as FormField[],
  };
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await db.applicationForm.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;

  return false;
}

/**
 * Validate and check slug availability
 */
export async function validateSlug(slug: string, excludeId?: string): Promise<SlugValidation> {
  if (!isValidSlug(slug)) {
    const suggestion = generateSlug(slug);
    return {
      isValid: false,
      isAvailable: false,
      suggestion: isValidSlug(suggestion) ? suggestion : undefined,
    };
  }

  const isAvailable = await isSlugAvailable(slug, excludeId);

  if (!isAvailable) {
    // Generate a unique slug suggestion
    let counter = 1;
    let suggestion = `${slug}-${counter}`;
    while (!(await isSlugAvailable(suggestion, excludeId))) {
      counter++;
      suggestion = `${slug}-${counter}`;
    }

    return {
      isValid: true,
      isAvailable: false,
      suggestion,
    };
  }

  return {
    isValid: true,
    isAvailable: true,
  };
}

/**
 * Create a new form
 */
export async function createForm(data: CreateFormData): Promise<ApplicationForm> {
  // Generate slug if not provided
  let slug = data.slug || generateSlug(data.name);

  // Ensure slug is unique
  const validation = await validateSlug(slug);
  if (!validation.isAvailable && validation.suggestion) {
    slug = validation.suggestion;
  }

  const form = await db.applicationForm.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      position: data.position,
      isActive: data.isActive ?? true,
      isTemplate: data.isTemplate ?? false,
      templateId: data.templateId,
      fields: data.fields as unknown as Prisma.InputJsonValue,
      headerText: data.headerText,
      footerText: data.footerText,
      createdBy: data.createdBy,
    },
  });

  return {
    ...form,
    fields: form.fields as unknown as FormField[],
  };
}

/**
 * Update a form
 */
export async function updateForm(id: string, data: UpdateFormData): Promise<ApplicationForm> {
  // If updating slug, validate it
  if (data.slug) {
    const validation = await validateSlug(data.slug, id);
    if (!validation.isValid) {
      throw new Error('Invalid slug format');
    }
    if (!validation.isAvailable) {
      throw new Error('Slug is already in use');
    }
  }

  const updateData: Prisma.ApplicationFormUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.isTemplate !== undefined) updateData.isTemplate = data.isTemplate;
  if (data.fields !== undefined) updateData.fields = data.fields as unknown as Prisma.InputJsonValue;
  if (data.headerText !== undefined) updateData.headerText = data.headerText;
  if (data.footerText !== undefined) updateData.footerText = data.footerText;

  const form = await db.applicationForm.update({
    where: { id },
    data: updateData,
  });

  return {
    ...form,
    fields: form.fields as unknown as FormField[],
  };
}

/**
 * Delete a form
 */
export async function deleteForm(id: string): Promise<void> {
  await db.applicationForm.delete({
    where: { id },
  });
}

/**
 * Duplicate a form
 */
export async function duplicateForm(id: string, createdBy: string): Promise<ApplicationForm> {
  const original = await getFormById(id);

  if (!original) {
    throw new Error('Form not found');
  }

  const newName = `${original.name} (Copy)`;
  const newSlug = generateSlug(newName);

  return createForm({
    name: newName,
    slug: newSlug,
    description: original.description || undefined,
    position: original.position,
    isActive: false, // Start as inactive
    isTemplate: false,
    templateId: original.isTemplate ? original.id : original.templateId || undefined,
    fields: original.fields,
    headerText: original.headerText || undefined,
    footerText: original.footerText || undefined,
    createdBy,
  });
}

/**
 * Get form templates only
 */
export async function getFormTemplates(): Promise<ApplicationFormListItem[]> {
  const { forms } = await getForms({
    includeTemplates: true,
    limit: 100,
  });

  return forms.filter((f) => f.isTemplate);
}

/**
 * Get form statistics
 */
export async function getFormStats(): Promise<FormStats> {
  const [
    totalForms,
    activeForms,
    templates,
    totalSubmissions,
    pendingSubmissions,
    processedSubmissions,
    failedSubmissions,
  ] = await Promise.all([
    db.applicationForm.count(),
    db.applicationForm.count({ where: { isActive: true, isTemplate: false } }),
    db.applicationForm.count({ where: { isTemplate: true } }),
    db.formSubmission.count(),
    db.formSubmission.count({ where: { status: 'PENDING' } }),
    db.formSubmission.count({ where: { status: 'PROCESSED' } }),
    db.formSubmission.count({ where: { status: 'FAILED' } }),
  ]);

  return {
    totalForms,
    activeForms,
    templates,
    totalSubmissions,
    pendingSubmissions,
    processedSubmissions,
    failedSubmissions,
  };
}

/**
 * Toggle form active status
 */
export async function toggleFormActive(id: string): Promise<ApplicationForm> {
  const form = await db.applicationForm.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!form) {
    throw new Error('Form not found');
  }

  return updateForm(id, { isActive: !form.isActive });
}
