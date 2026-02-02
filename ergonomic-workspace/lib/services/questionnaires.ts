/**
 * Questionnaire Service
 *
 * CRUD operations for Questionnaire Templates (reusable questionnaire forms).
 * Handles template creation, retrieval, updates, and deletion.
 * 
 * Note: This service manages QuestionnaireTemplate models.
 * For client-specific questionnaire instances, see questionnaire-instances.ts
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { getUserById } from './users';
import type {
  QuestionnaireListItem,
  QuestionnaireWithQuestions,
  QuestionnaireInput,
  QuestionInput,
  PublicQuestionnaireData,
  PublicQuestion,
} from '@/types/questionnaire';

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
 * Note: QuestionnaireTemplate doesn't use slugs, but we keep this for consistency
 */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  // Templates don't use slugs, but we can check by name if needed
  return true;
}

// =============================================================================
// Questionnaire CRUD Operations
// =============================================================================

/**
 * Get all questionnaire templates with pagination
 */
export async function getQuestionnaires(options?: {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}): Promise<{ questionnaires: QuestionnaireListItem[]; total: number }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    let query = collections.questionnaireTemplates() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

    if (options?.activeOnly) {
      query = query.where('isActive', '==', true);
    }

    let snapshot;
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      // Try to order by createdAt
      const orderedQuery = query.orderBy('createdAt', 'desc');
      snapshot = await orderedQuery.get();
      docs = snapshot.docs;
    } catch (error) {
      // If orderBy fails (e.g., no index or field doesn't exist), query without ordering
      console.warn('Could not order by createdAt, querying without order:', error);
      snapshot = await query.get();
      // Sort client-side by createdAt if available
      docs = [...snapshot.docs].sort((a, b) => {
        const aDate = timestampToDate(a.data().createdAt);
        const bDate = timestampToDate(b.data().createdAt);
        if (!aDate || !bDate) return 0;
        return bDate.getTime() - aDate.getTime(); // desc
      });
    }

    const total = snapshot.size;

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedDocs = docs.slice(startIndex, startIndex + limit);

  const questionnaires = await Promise.all(
    paginatedDocs.map(async (doc) => {
      const data = doc.data();
      const questions = Array.isArray(data.questions) ? data.questions.length : (data.questionsCount || 0);

      // Get creator info
      let creator = { displayName: data.creator?.displayName || 'System' };
      if (data.createdBy && !data.creator) {
        try {
          const creatorUser = await getUserById(data.createdBy);
          if (creatorUser) {
            creator = { displayName: creatorUser.displayName };
          }
        } catch (error) {
          console.warn('Could not fetch creator user:', error);
        }
      }

      // Get response count
      const responsesSnapshot = await collections
        .questionnaires()
        .where('templateId', '==', doc.id)
        .get();

      return {
        id: doc.id,
        name: data.name || 'Unnamed Questionnaire',
        slug: data.slug || doc.id, // Use slug from data or ID as fallback
        isActive: data.isActive !== undefined ? data.isActive : true,
        questionsCount: questions,
        responsesCount: data.responsesCount || responsesSnapshot.size,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        creator,
      };
    })
  );

    return { questionnaires, total };
  } catch (error) {
    console.error('Error in getQuestionnaires:', error);
    // Return empty result instead of throwing
    return { questionnaires: [], total: 0 };
  }
}

/**
 * Get a questionnaire template by ID with all questions
 */
export async function getQuestionnaireById(id: string): Promise<QuestionnaireWithQuestions | null> {
  const doc = await collections.questionnaireTemplates().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  const questions = Array.isArray(data.questions)
    ? (data.questions as unknown[]).map((q: any, index: number) => ({
        id: q.id || `q-${index}`,
        questionnaireId: doc.id,
        order: q.order ?? index + 1,
        type: q.type,
        text: q.text,
        helpText: q.helpText,
        required: q.required ?? true,
        section: q.section,
        options: q.options,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        updatedAt: timestampToDate(data.updatedAt) || new Date(),
      }))
    : [];

  // Get creator info
  let creator;
  if (data.createdBy) {
    const creatorUser = await getUserById(data.createdBy);
    if (creatorUser) {
      creator = {
        id: creatorUser.id,
        displayName: creatorUser.displayName,
        email: creatorUser.email,
      };
    }
  }

  return {
    id: doc.id,
    name: data.name,
    slug: doc.id,
    description: data.description || null,
    isActive: data.isActive,
    headerText: null,
    footerText: null,
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    questions,
    creator,
  } as QuestionnaireWithQuestions;
}

/**
 * Get a questionnaire template by slug (ID) with all questions
 */
export async function getQuestionnaireBySlug(slug: string): Promise<QuestionnaireWithQuestions | null> {
  // For templates, slug is the ID
  return getQuestionnaireById(slug);
}

/**
 * Create a new questionnaire template with questions
 */
export async function createQuestionnaire(
  data: QuestionnaireInput,
  createdBy: string
): Promise<QuestionnaireWithQuestions> {
  // Store questions as JSON array
  // Convert undefined values to null for Firestore compatibility
  const questionsJson = data.questions.map((q, index) => ({
    id: q.id || `q-${Date.now()}-${index}`,
    order: q.order ?? index + 1,
    type: q.type,
    text: q.text,
    helpText: q.helpText ?? null,
    required: q.required ?? true,
    options: q.options ?? null,
    section: q.section ?? null,
  }));

  const id = generateId();
  const templateData = {
    id,
    name: data.name,
    description: data.description || null,
    isActive: data.isActive ?? true,
    questions: questionsJson,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.questionnaireTemplates().doc(id).set(templateData);

  // Return in expected format
  const questions = questionsJson.map((q) => ({
    id: q.id,
    questionnaireId: id,
    order: q.order,
    type: q.type,
    text: q.text,
    helpText: q.helpText,
    required: q.required,
    section: q.section,
    options: q.options,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  return {
    id,
    name: data.name,
    slug: id,
    description: data.description || null,
    isActive: data.isActive ?? true,
    headerText: data.headerText || null,
    footerText: data.footerText || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    questions,
    creator: undefined,
  } as QuestionnaireWithQuestions;
}

/**
 * Update a questionnaire template
 */
export async function updateQuestionnaire(
  id: string,
  data: Partial<QuestionnaireInput>
): Promise<QuestionnaireWithQuestions> {
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  // Handle questions update if provided
  if (data.questions) {
    // Convert undefined values to null for Firestore compatibility
    const questionsJson = data.questions.map((q, index) => ({
      id: q.id || `q-${Date.now()}-${index}`,
      order: q.order ?? index + 1,
      type: q.type,
      text: q.text,
      helpText: q.helpText ?? null,
      required: q.required ?? true,
      options: q.options ?? null,
      section: q.section ?? null,
    }));
    updateData.questions = questionsJson;
  }

  await collections.questionnaireTemplates().doc(id).update(updateData);

  // Get updated template
  const template = await getQuestionnaireById(id);
  if (!template) {
    throw new Error('Questionnaire template not found');
  }

  return {
    ...template,
    headerText: data.headerText,
    footerText: data.footerText,
  } as QuestionnaireWithQuestions;
}

/**
 * Delete a questionnaire template
 */
export async function deleteQuestionnaire(id: string): Promise<void> {
  // Check if template has any questionnaire instances
  const instancesSnapshot = await collections
    .questionnaires()
    .where('templateId', '==', id)
    .get();

  if (instancesSnapshot.size > 0) {
    throw new Error('Cannot delete template with existing questionnaire instances');
  }

  await collections.questionnaireTemplates().doc(id).delete();
}

/**
 * Toggle questionnaire template active status
 */
export async function toggleQuestionnaireActive(id: string): Promise<QuestionnaireWithQuestions> {
  const doc = await collections.questionnaireTemplates().doc(id).get();

  if (!doc.exists) {
    throw new Error('Questionnaire template not found');
  }

  const data = doc.data()!;
  return updateQuestionnaire(id, { isActive: !data.isActive });
}

// =============================================================================
// Public Questionnaire Data (for client-facing pages)
// =============================================================================

/**
 * Get public questionnaire data by slug (ID) (no sensitive info)
 * Note: This gets a template, but for client-facing pages, you'd use questionnaire instances
 */
export async function getPublicQuestionnaire(slug: string): Promise<PublicQuestionnaireData | null> {
  const doc = await collections.questionnaireTemplates().doc(slug).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  if (!data.isActive) {
    return null;
  }

  const questionsCount = Array.isArray(data.questions) ? data.questions.length : 0;

  return {
    id: doc.id,
    name: data.name,
    slug: doc.id,
    description: data.description || null,
    headerText: null,
    footerText: null,
    questionsCount,
  };
}

/**
 * Get public questions for a questionnaire template (for taking questionnaire)
 */
export async function getPublicQuestions(questionnaireId: string): Promise<PublicQuestion[]> {
  const doc = await collections.questionnaireTemplates().doc(questionnaireId).get();

  if (!doc.exists) {
    return [];
  }

  const data = doc.data()!;
  if (!Array.isArray(data.questions)) {
    return [];
  }

  const questions = data.questions as unknown[];

  return questions
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    .map((q: any) => ({
      id: q.id || `q-${q.order}`,
      order: q.order || 0,
      type: q.type,
      text: q.text,
      helpText: q.helpText || null,
      required: q.required ?? true,
      section: q.section || null,
      options: q.options as PublicQuestion['options'],
    }));
}
