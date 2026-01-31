/**
 * Form Submissions Service
 *
 * Handles form submission creation, processing, and retrieval.
 * Processes submissions into Person and Application records.
 */

import { db } from '@/lib/db';
import { findOrCreatePerson, hasPassedGeneralCompetencies } from './persons';
import {
  logPersonCreated,
  logApplicationCreated,
  logStageChange,
  logStatusChange,
} from '@/lib/audit';
import type {
  FormSubmission,
  FormSubmissionListItem,
  CreateSubmissionData,
  FormField,
  ExtractedPersonData,
  ExtractedApplicationData,
  FileUploadData,
} from '@/types/form';
import type { Prisma } from '@/lib/generated/prisma/client';

/**
 * Get submissions for a form
 */
export async function getFormSubmissions(
  formId: string,
  options?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'PROCESSED' | 'FAILED';
  }
): Promise<{ submissions: FormSubmissionListItem[]; total: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.FormSubmissionWhereInput = { formId };

  if (options?.status) {
    where.status = options.status;
  }

  const [submissions, total] = await Promise.all([
    db.formSubmission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        formId: true,
        status: true,
        submittedAt: true,
        processedAt: true,
        data: true,
        form: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
        person: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    db.formSubmission.count({ where }),
  ]);

  // Extract basic info from data for display
  const formattedSubmissions: FormSubmissionListItem[] = submissions.map((s) => {
    const data = s.data as Record<string, unknown>;
    return {
      id: s.id,
      formId: s.formId,
      status: s.status,
      submittedAt: s.submittedAt,
      processedAt: s.processedAt,
      data: {
        email: data.email as string | undefined,
        firstName: data.firstName as string | undefined,
        lastName: data.lastName as string | undefined,
      },
      form: s.form,
      person: s.person,
    };
  });

  return { submissions: formattedSubmissions, total };
}

/**
 * Get a submission by ID
 */
export async function getSubmissionById(id: string): Promise<FormSubmission | null> {
  const submission = await db.formSubmission.findUnique({
    where: { id },
  });

  if (!submission) return null;

  return {
    ...submission,
    data: submission.data as Record<string, unknown>,
    files: submission.files as FileUploadData[] | null,
  };
}

/**
 * Create a new form submission
 */
export async function createSubmission(data: CreateSubmissionData): Promise<FormSubmission> {
  const submission = await db.formSubmission.create({
    data: {
      formId: data.formId,
      data: data.data as Prisma.InputJsonValue,
      files: data.files as unknown as Prisma.InputJsonValue,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });

  return {
    ...submission,
    data: submission.data as Record<string, unknown>,
    files: submission.files as FileUploadData[] | null,
  };
}

/**
 * Extract person data from submission based on field mappings
 */
function extractPersonData(
  submissionData: Record<string, unknown>,
  fields: FormField[],
  files: FileUploadData[] | null
): ExtractedPersonData {
  const personData: Partial<ExtractedPersonData> = {};

  for (const field of fields) {
    if (!field.mappedTo?.startsWith('person.')) continue;

    const personField = field.mappedTo.replace('person.', '');
    const value = submissionData[field.id];

    if (value !== undefined && value !== null && value !== '') {
      (personData as Record<string, unknown>)[personField] = value;
    }
  }

  // Validate required fields
  if (!personData.email) {
    throw new Error('Email is required');
  }
  if (!personData.firstName) {
    throw new Error('First name is required');
  }
  if (!personData.lastName) {
    throw new Error('Last name is required');
  }

  return personData as ExtractedPersonData;
}

/**
 * Extract application data from submission based on field mappings
 */
function extractApplicationData(
  submissionData: Record<string, unknown>,
  fields: FormField[],
  files: FileUploadData[] | null,
  position: string
): ExtractedApplicationData {
  const appData: Partial<ExtractedApplicationData> = {
    position,
    hasResume: false,
    hasAcademicBg: false,
    hasVideoIntro: false,
    hasPreviousExp: false,
    hasOtherFile: false,
  };

  for (const field of fields) {
    if (!field.mappedTo?.startsWith('application.')) continue;

    const appField = field.mappedTo.replace('application.', '');
    const value = submissionData[field.id];

    // Handle file fields
    if (field.type === 'file' && files) {
      const fileData = files.find((f) => f.fieldId === field.id);
      if (fileData) {
        (appData as Record<string, unknown>)[appField] = fileData.fileUrl;

        // Set corresponding has* flag
        if (appField === 'resumeUrl') appData.hasResume = true;
        if (appField === 'otherFileUrl') appData.hasOtherFile = true;
      }
    } else if (value !== undefined && value !== null && value !== '') {
      (appData as Record<string, unknown>)[appField] = value;

      // Set corresponding has* flags for text fields
      if (appField === 'academicBackground') appData.hasAcademicBg = true;
      if (appField === 'previousExperience') appData.hasPreviousExp = true;
      if (appField === 'videoLink') appData.hasVideoIntro = true;
    }
  }

  return appData as ExtractedApplicationData;
}

/**
 * Process a submission - create Person and Application records
 */
export async function processSubmission(
  submissionId: string,
  ipAddress?: string
): Promise<{
  success: boolean;
  personId?: string;
  applicationId?: string;
  error?: string;
}> {
  try {
    // Get the submission with form data
    const submission = await db.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        form: true,
      },
    });

    if (!submission) {
      return { success: false, error: 'Submission not found' };
    }

    if (submission.status !== 'PENDING') {
      return {
        success: false,
        error: `Submission already ${submission.status.toLowerCase()}`,
      };
    }

    const submissionData = submission.data as Record<string, unknown>;
    const fields = submission.form.fields as unknown as FormField[];
    const files = submission.files as unknown as FileUploadData[] | null;

    // Extract person and application data
    const personData = extractPersonData(submissionData, fields, files);
    const applicationData = extractApplicationData(
      submissionData,
      fields,
      files,
      submission.form.position
    );

    // Find or create person
    const { person, created: personCreated } = await findOrCreatePerson({
      email: personData.email,
      firstName: personData.firstName,
      lastName: personData.lastName,
      middleName: personData.middleName,
      phoneNumber: personData.phoneNumber,
      country: personData.country,
      city: personData.city,
      state: personData.state,
      portfolioLink: personData.portfolioLink,
      educationLevel: personData.educationLevel,
    });

    if (personCreated) {
      await logPersonCreated(
        person.id,
        {
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
          source: 'proprietary_form',
          formId: submission.formId,
        },
        ipAddress
      );
    }

    // Create application
    const application = await db.application.create({
      data: {
        personId: person.id,
        position: applicationData.position,
        resumeUrl: applicationData.resumeUrl,
        academicBackground: applicationData.academicBackground,
        previousExperience: applicationData.previousExperience,
        videoLink: applicationData.videoLink,
        otherFileUrl: applicationData.otherFileUrl,
        hasResume: applicationData.hasResume,
        hasAcademicBg: applicationData.hasAcademicBg,
        hasVideoIntro: applicationData.hasVideoIntro,
        hasPreviousExp: applicationData.hasPreviousExp,
        hasOtherFile: applicationData.hasOtherFile,
        formSubmissionId: submissionId,
      },
    });

    await logApplicationCreated(
      application.id,
      person.id,
      application.position,
      {
        formSubmissionId: submissionId,
        formId: submission.formId,
        personCreated,
      },
      ipAddress
    );

    // Check GC status and potentially advance
    if (person.generalCompetenciesCompleted) {
      const passedGC = await hasPassedGeneralCompetencies(person.id);

      if (passedGC) {
        // Advance to specialized competencies
        await db.application.update({
          where: { id: application.id },
          data: { currentStage: 'SPECIALIZED_COMPETENCIES' },
        });

        await logStageChange(
          application.id,
          person.id,
          'APPLICATION',
          'SPECIALIZED_COMPETENCIES',
          undefined,
          'Auto-advanced: Person already passed general competencies'
        );
      } else {
        // Reject - GC failed
        await db.application.update({
          where: { id: application.id },
          data: { status: 'REJECTED' },
        });

        await logStatusChange(
          application.id,
          person.id,
          'ACTIVE',
          'REJECTED',
          undefined,
          'Auto-rejected: Person previously failed general competencies'
        );
      }
    }

    // Update submission status
    await db.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        personId: person.id,
      },
    });

    return {
      success: true,
      personId: person.id,
      applicationId: application.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update submission with error
    await db.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
        errorMessage,
      },
    });

    console.error('[FormSubmission] Processing failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Retry a failed submission
 */
export async function retrySubmission(submissionId: string): Promise<{
  success: boolean;
  personId?: string;
  applicationId?: string;
  error?: string;
}> {
  // Reset status to pending
  await db.formSubmission.update({
    where: { id: submissionId },
    data: {
      status: 'PENDING',
      processedAt: null,
      errorMessage: null,
    },
  });

  // Process again
  return processSubmission(submissionId);
}

/**
 * Delete a submission
 */
export async function deleteSubmission(id: string): Promise<void> {
  await db.formSubmission.delete({
    where: { id },
  });
}

/**
 * Get pending submissions count
 */
export async function getPendingSubmissionsCount(): Promise<number> {
  return db.formSubmission.count({
    where: { status: 'PENDING' },
  });
}

/**
 * Process all pending submissions
 */
export async function processAllPendingSubmissions(): Promise<{
  processed: number;
  failed: number;
}> {
  const pending = await db.formSubmission.findMany({
    where: { status: 'PENDING' },
    select: { id: true },
  });

  let processed = 0;
  let failed = 0;

  for (const submission of pending) {
    const result = await processSubmission(submission.id);
    if (result.success) {
      processed++;
    } else {
      failed++;
    }
  }

  return { processed, failed };
}
