/**
 * Assessment Service
 *
 * Provides operations for managing workspace assessments.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { AssessmentStatus, AssessmentType } from '@/lib/types/firestore';
import { getClientById } from './clients';
import { getUserById } from './users';

export interface AssessmentListItem {
  id: string;
  clientId: string;
  projectId: string | null;
  type: AssessmentType;
  status: AssessmentStatus;
  conductedDate: Date | null;
  reportUrl: string | null;
  client: {
    id: string;
    companyName: string;
  };
  project: {
    id: string;
    name: string;
  } | null;
  conductedByUser: {
    id: string;
    displayName: string;
  } | null;
  createdAt: Date;
}

export interface CreateAssessmentData {
  clientId: string;
  projectId?: string;
  type: AssessmentType;
  status?: AssessmentStatus;
  conductedDate?: Date;
  notes?: string;
  conductedBy?: string;
}

/**
 * Get assessments with pagination
 *
 * @param options - Query options
 * @returns Assessments and total count
 */
export async function getAssessments(options?: {
  page?: number;
  limit?: number;
  clientId?: string;
  projectId?: string;
  status?: AssessmentStatus;
  type?: AssessmentType;
}): Promise<{ assessments: AssessmentListItem[]; total: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;

  let query = collections.assessments() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options?.clientId) {
    query = query.where('clientId', '==', options.clientId);
  }

  if (options?.projectId) {
    query = query.where('projectId', '==', options.projectId);
  }

  if (options?.status) {
    query = query.where('status', '==', options.status);
  }

  if (options?.type) {
    query = query.where('type', '==', options.type);
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

  const total = docs.length;

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const paginatedDocs = docs.slice(startIndex, startIndex + limit);

  const assessments = await Promise.all(
    paginatedDocs.map(async (doc) => {
      const data = doc.data();

      // Get related data
      const [client, project, conductedByUser] = await Promise.all([
        getClientById(data.clientId),
        data.projectId ? collections.projects().doc(data.projectId).get() : null,
        data.conductedBy ? getUserById(data.conductedBy) : null,
      ]);

      return {
        id: doc.id,
        clientId: data.clientId,
        projectId: data.projectId || null,
        type: data.type as AssessmentType,
        status: data.status as AssessmentStatus,
        conductedDate: timestampToDate(data.conductedDate),
        reportUrl: data.reportUrl || null,
        client: {
          id: client?.id || data.clientId,
          companyName: client?.companyName || 'Unknown',
        },
        project: project?.exists
          ? {
              id: project.id,
              name: project.data()?.name || 'Unknown',
            }
          : null,
        conductedByUser: conductedByUser
          ? {
              id: conductedByUser.id,
              displayName: conductedByUser.displayName,
            }
          : null,
        createdAt: timestampToDate(data.createdAt) || new Date(),
      };
    })
  );

  return { assessments, total };
}

/**
 * Get a single assessment by ID
 */
export async function getAssessmentById(id: string) {
  const doc = await collections.assessments().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;

  // Get related data
  const [client, project, conductedByUser, questionnaireDoc] = await Promise.all([
    getClientById(data.clientId),
    data.projectId ? collections.projects().doc(data.projectId).get() : null,
    data.conductedBy ? getUserById(data.conductedBy) : null,
    data.questionnaireId ? collections.questionnaires().doc(data.questionnaireId).get() : null,
  ]);

  // Get questionnaire responses if questionnaire exists
  let questionnaire = null;
  if (questionnaireDoc?.exists) {
    const questionnaireData = questionnaireDoc.data()!;
    const responsesSnapshot = await collections
      .questionnaireResponses()
      .where('questionnaireId', '==', questionnaireDoc.id)
      .orderBy('submittedAt', 'asc')
      .get();

    questionnaire = {
      ...toPlainObject(questionnaireData),
      id: questionnaireDoc.id,
      responses: responsesSnapshot.docs.map((responseDoc) => ({
        id: responseDoc.id,
        ...toPlainObject(responseDoc.data()),
        submittedAt: timestampToDate(responseDoc.data().submittedAt) || new Date(),
      })),
    };
  }

  return {
    id: doc.id,
    ...toPlainObject(data),
    conductedDate: timestampToDate(data.conductedDate),
    reportGeneratedAt: timestampToDate(data.reportGeneratedAt),
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    client: client
      ? {
          id: client.id,
          companyName: client.companyName,
          industry: client.industry,
        }
      : null,
    project: project?.exists
      ? {
          id: project.id,
          name: project.data()?.name || 'Unknown',
          status: project.data()?.status || null,
        }
      : null,
    conductedByUser: conductedByUser
      ? {
          id: conductedByUser.id,
          displayName: conductedByUser.displayName,
          email: conductedByUser.email,
        }
      : null,
    questionnaire,
  };
}

/**
 * Create a new assessment
 */
export async function createAssessment(data: CreateAssessmentData) {
  const id = generateId();
  const assessmentData = {
    id,
    clientId: data.clientId,
    projectId: data.projectId || null,
    type: data.type,
    status: data.status || AssessmentStatus.SCHEDULED,
    conductedDate: data.conductedDate || null,
    notes: data.notes || null,
    conductedBy: data.conductedBy || null,
    findings: null,
    recommendations: null,
    reportUrl: null,
    reportGeneratedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.assessments().doc(id).set(assessmentData);

  // Get related data for return
  const [client, project] = await Promise.all([
    getClientById(data.clientId),
    data.projectId ? collections.projects().doc(data.projectId).get() : null,
  ]);

  return {
    id,
    ...assessmentData,
    createdAt: new Date(),
    updatedAt: new Date(),
    client: client
      ? {
          id: client.id,
          companyName: client.companyName,
        }
      : null,
    project: project?.exists
      ? {
          id: project.id,
          name: project.data()?.name || 'Unknown',
        }
      : null,
  };
}

/**
 * Update an assessment
 */
export async function updateAssessment(
  id: string,
  data: Partial<CreateAssessmentData> & {
    findings?: Record<string, unknown>;
    recommendations?: Record<string, unknown>;
    reportUrl?: string;
    reportGeneratedAt?: Date;
  }
) {
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.clientId) updateData.clientId = data.clientId;
  if (data.projectId !== undefined) updateData.projectId = data.projectId;
  if (data.type) updateData.type = data.type;
  if (data.status) updateData.status = data.status;
  if (data.conductedDate !== undefined) updateData.conductedDate = data.conductedDate;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.conductedBy !== undefined) updateData.conductedBy = data.conductedBy;
  if (data.findings !== undefined) updateData.findings = data.findings;
  if (data.recommendations !== undefined) updateData.recommendations = data.recommendations;
  if (data.reportUrl !== undefined) updateData.reportUrl = data.reportUrl;
  if (data.reportGeneratedAt !== undefined) updateData.reportGeneratedAt = data.reportGeneratedAt;

  await collections.assessments().doc(id).update(updateData);

  // Get updated assessment with related data
  const assessment = await getAssessmentById(id);
  if (!assessment) {
    throw new Error('Assessment not found');
  }

  // Get client and project for return
  const [client, project] = await Promise.all([
    getClientById(assessment.clientId),
    assessment.projectId ? collections.projects().doc(assessment.projectId).get() : null,
  ]);

  return {
    ...assessment,
    client: client
      ? {
          id: client.id,
          companyName: client.companyName,
        }
      : null,
    project: project?.exists
      ? {
          id: project.id,
          name: project.data()?.name || 'Unknown',
        }
      : null,
  };
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(id: string): Promise<void> {
  await collections.assessments().doc(id).delete();
}
