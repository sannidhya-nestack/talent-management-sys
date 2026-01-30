/**
 * Assessment Templates Service
 *
 * CRUD operations for Assessment Templates (questionnaires).
 * Handles template creation, retrieval, updates, and deletion.
 */

import { db } from '@/lib/db';
import type {
  AssessmentTemplateListItem,
  AssessmentTemplateWithQuestions,
  AssessmentTemplateInput,
  AssessmentQuestionInput,
  AssessmentTemplateForEmail,
  PublicAssessmentData,
  PublicQuestion,
  QuestionOption,
} from '@/types/assessment';
import type {
  Prisma,
  AssessmentTemplateType,
} from '@/lib/generated/prisma/client';

// =============================================================================
// Slug Utilities
// =============================================================================

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Check if a slug is valid format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 50;
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await db.assessmentTemplate.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;
  return false;
}

// =============================================================================
// Template CRUD Operations
// =============================================================================

/**
 * Get all templates with pagination
 */
export async function getTemplates(options?: {
  page?: number;
  limit?: number;
  type?: AssessmentTemplateType;
  position?: string;
  activeOnly?: boolean;
}): Promise<{ templates: AssessmentTemplateListItem[]; total: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.AssessmentTemplateWhereInput = {};

  if (options?.activeOnly) {
    where.isActive = true;
  }

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.position) {
    where.position = options.position;
  }

  const [templates, total] = await Promise.all([
    db.assessmentTemplate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        position: true,
        isActive: true,
        passingScore: true,
        maxScore: true,
        timeLimit: true,
        createdAt: true,
        creator: {
          select: {
            displayName: true,
          },
        },
        _count: {
          select: {
            questions: true,
            sessions: true,
          },
        },
      },
    }),
    db.assessmentTemplate.count({ where }),
  ]);

  // Transform to expected format
  const formattedTemplates: AssessmentTemplateListItem[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    type: t.type,
    position: t.position,
    isActive: t.isActive,
    passingScore: t.passingScore,
    maxScore: t.maxScore,
    timeLimit: t.timeLimit,
    questionsCount: t._count.questions,
    sessionsCount: t._count.sessions,
    createdAt: t.createdAt,
    creator: t.creator,
  }));

  return { templates: formattedTemplates, total };
}

/**
 * Get a template by ID with all questions
 */
export async function getTemplateById(id: string): Promise<AssessmentTemplateWithQuestions | null> {
  const template = await db.assessmentTemplate.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
      creator: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  return template as AssessmentTemplateWithQuestions | null;
}

/**
 * Get a template by slug with all questions
 */
export async function getTemplateBySlug(slug: string): Promise<AssessmentTemplateWithQuestions | null> {
  const template = await db.assessmentTemplate.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
      creator: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  return template as AssessmentTemplateWithQuestions | null;
}

/**
 * Create a new template with questions
 */
export async function createTemplate(
  data: AssessmentTemplateInput,
  createdBy: string
): Promise<AssessmentTemplateWithQuestions> {
  // Validate slug
  if (!isValidSlug(data.slug)) {
    throw new Error('Invalid slug format');
  }

  const slugAvailable = await isSlugAvailable(data.slug);
  if (!slugAvailable) {
    throw new Error('Slug is already in use');
  }

  // Calculate max score from questions
  const calculatedMaxScore = data.questions.reduce((sum, q) => sum + q.points, 0);

  const template = await db.assessmentTemplate.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      type: data.type,
      position: data.position,
      isActive: data.isActive ?? true,
      passingScore: data.passingScore,
      maxScore: calculatedMaxScore,
      timeLimit: data.timeLimit,
      headerText: data.headerText,
      footerText: data.footerText,
      createdBy,
      questions: {
        create: data.questions.map((q, index) => ({
          order: q.order ?? index + 1,
          type: q.type,
          text: q.text,
          helpText: q.helpText,
          required: q.required ?? true,
          points: q.points,
          options: q.options as Prisma.InputJsonValue,
          section: q.section,
        })),
      },
    },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
      creator: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  return template as AssessmentTemplateWithQuestions;
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  data: Partial<AssessmentTemplateInput>
): Promise<AssessmentTemplateWithQuestions> {
  // Check if slug is being changed and validate
  if (data.slug) {
    if (!isValidSlug(data.slug)) {
      throw new Error('Invalid slug format');
    }

    const slugAvailable = await isSlugAvailable(data.slug, id);
    if (!slugAvailable) {
      throw new Error('Slug is already in use');
    }
  }

  // Build update data
  const updateData: Prisma.AssessmentTemplateUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.passingScore !== undefined) updateData.passingScore = data.passingScore;
  if (data.timeLimit !== undefined) updateData.timeLimit = data.timeLimit;
  if (data.headerText !== undefined) updateData.headerText = data.headerText;
  if (data.footerText !== undefined) updateData.footerText = data.footerText;

  // Handle questions update if provided
  if (data.questions) {
    // Delete existing questions and create new ones
    await db.assessmentQuestion.deleteMany({
      where: { templateId: id },
    });

    // Calculate new max score
    const calculatedMaxScore = data.questions.reduce((sum, q) => sum + q.points, 0);
    updateData.maxScore = calculatedMaxScore;

    // Create new questions
    await db.assessmentQuestion.createMany({
      data: data.questions.map((q, index) => ({
        templateId: id,
        order: q.order ?? index + 1,
        type: q.type,
        text: q.text,
        helpText: q.helpText,
        required: q.required ?? true,
        points: q.points,
        options: q.options as Prisma.InputJsonValue,
        section: q.section,
      })),
    });
  }

  const template = await db.assessmentTemplate.update({
    where: { id },
    data: updateData,
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
      creator: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  return template as AssessmentTemplateWithQuestions;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  // Check if template has any sessions
  const sessionsCount = await db.assessmentSession.count({
    where: { templateId: id },
  });

  if (sessionsCount > 0) {
    throw new Error('Cannot delete template with existing sessions');
  }

  await db.assessmentTemplate.delete({
    where: { id },
  });
}

/**
 * Toggle template active status
 */
export async function toggleTemplateActive(id: string): Promise<AssessmentTemplateWithQuestions> {
  const template = await db.assessmentTemplate.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  return updateTemplate(id, { isActive: !template.isActive });
}

// =============================================================================
// Template Selection for Emails
// =============================================================================

/**
 * Get templates available for email selection
 * - For GC: Returns active GC templates
 * - For SC: Returns active SC templates, optionally filtered by position
 */
export async function getTemplatesForEmail(options: {
  type: AssessmentTemplateType;
  position?: string;
}): Promise<AssessmentTemplateForEmail[]> {
  const where: Prisma.AssessmentTemplateWhereInput = {
    isActive: true,
    type: options.type,
  };

  // For SC, filter by position if provided
  if (options.type === 'SPECIALIZED_COMPETENCIES' && options.position) {
    where.position = options.position;
  }

  const templates = await db.assessmentTemplate.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      position: true,
    },
    orderBy: { name: 'asc' },
  });

  return templates;
}

// =============================================================================
// Public Template Data (for candidate-facing pages)
// =============================================================================

/**
 * Get public template data by slug (no sensitive info)
 */
export async function getPublicTemplate(slug: string): Promise<PublicAssessmentData | null> {
  const template = await db.assessmentTemplate.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      type: true,
      position: true,
      timeLimit: true,
      headerText: true,
      footerText: true,
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  if (!template) return null;

  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    description: template.description,
    type: template.type,
    position: template.position,
    timeLimit: template.timeLimit,
    headerText: template.headerText,
    footerText: template.footerText,
    questionsCount: template._count.questions,
  };
}

/**
 * Get public questions for a template (for taking assessment)
 * Excludes scoring information for non-choice questions
 */
export async function getPublicQuestions(templateId: string): Promise<PublicQuestion[]> {
  const questions = await db.assessmentQuestion.findMany({
    where: { templateId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      type: true,
      text: true,
      helpText: true,
      required: true,
      section: true,
      options: true,
    },
  });

  // For choice questions, remove point values from options (to prevent gaming)
  return questions.map((q) => {
    let sanitizedOptions = q.options;

    if (
      (q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_SELECT') &&
      Array.isArray(q.options)
    ) {
      // Remove points from options
      sanitizedOptions = (q.options as unknown as QuestionOption[]).map((opt) => ({
        id: opt.id,
        text: opt.text,
      }));
    }

    return {
      id: q.id,
      order: q.order,
      type: q.type,
      text: q.text,
      helpText: q.helpText,
      required: q.required,
      section: q.section,
      options: sanitizedOptions as PublicQuestion['options'],
    };
  });
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get template statistics
 */
export async function getTemplateStats(id: string): Promise<{
  totalSessions: number;
  completedSessions: number;
  passRate: number;
  averageScore: number;
}> {
  const sessions = await db.assessmentSession.findMany({
    where: { templateId: id },
    select: {
      status: true,
      score: true,
      passed: true,
    },
  });

  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const passedSessions = completedSessions.filter((s) => s.passed);
  const scores = completedSessions.map((s) => s.score ?? 0);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    passRate: completedSessions.length > 0 ? (passedSessions.length / completedSessions.length) * 100 : 0,
    averageScore,
  };
}
