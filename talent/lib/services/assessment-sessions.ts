/**
 * Assessment Sessions Service
 *
 * Manages assessment sessions, scoring, and pipeline updates.
 * Handles session lifecycle from start to completion.
 */

import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import type {
  AssessmentSessionWithResponses,
  ResponseSubmission,
  SessionResult,
  AnswerData,
  QuestionOption,
  LikertConfig,
  RatingConfig,
} from '@/types/assessment';
import type {
  Prisma,
  SessionStatus,
  QuestionType,
} from '@/lib/generated/prisma/client';
import { recruitment } from '@/config/recruitment';

// =============================================================================
// Score Normalization
// =============================================================================

/**
 * Normalize GC score from raw 0-maxScore to 0-1000 scale
 */
export function normalizeGCScore(rawScore: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  const scale = recruitment.assessmentThresholds.generalCompetencies.scale;
  return Math.round((rawScore / maxScore) * scale);
}

/**
 * Normalize SC score from raw 0-maxScore to 0-600 scale
 */
export function normalizeSCScore(rawScore: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  const scale = recruitment.assessmentThresholds.specializedCompetencies.scale;
  return Math.round((rawScore / maxScore) * scale);
}

/**
 * Check if normalized GC score passes threshold
 */
export function isGCPassed(normalizedScore: number): boolean {
  return normalizedScore >= recruitment.assessmentThresholds.generalCompetencies.threshold;
}

/**
 * Check if normalized SC score passes threshold
 */
export function isSCPassed(normalizedScore: number): boolean {
  return normalizedScore >= recruitment.assessmentThresholds.specializedCompetencies.threshold;
}

// =============================================================================
// Session Lifecycle
// =============================================================================

/**
 * Start a new assessment session
 */
export async function startSession(params: {
  templateId: string;
  personId: string;
  applicationId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ sessionId: string; expiresAt?: Date }> {
  const { templateId, personId, applicationId, ipAddress, userAgent } = params;

  // Check if template exists and is active
  const template = await db.assessmentTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      isActive: true,
      timeLimit: true,
      type: true,
    },
  });

  if (!template) {
    throw new Error('Assessment template not found');
  }

  if (!template.isActive) {
    throw new Error('Assessment is not currently active');
  }

  // Check for existing session
  const existingSession = await db.assessmentSession.findFirst({
    where: {
      templateId,
      personId,
      applicationId: applicationId ?? null,
      status: { in: ['IN_PROGRESS', 'COMPLETED'] },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingSession?.status === 'COMPLETED') {
    throw new Error('You have already completed this assessment');
  }

  // If there's an in-progress session, return it
  if (existingSession?.status === 'IN_PROGRESS') {
    return {
      sessionId: existingSession.id,
      expiresAt: template.timeLimit
        ? new Date(Date.now() + template.timeLimit * 60 * 1000)
        : undefined,
    };
  }

  // Create new session
  const session = await db.assessmentSession.create({
    data: {
      templateId,
      personId,
      applicationId,
      status: 'IN_PROGRESS',
      ipAddress,
      userAgent,
    },
    select: {
      id: true,
    },
  });

  // Log the session start
  await createAuditLog({
    personId,
    applicationId,
    action: 'Assessment session started',
    actionType: 'CREATE',
    details: {
      sessionId: session.id,
      templateId,
      assessmentType: template.type,
    },
    ipAddress,
    userAgent,
  });

  return {
    sessionId: session.id,
    expiresAt: template.timeLimit
      ? new Date(Date.now() + template.timeLimit * 60 * 1000)
      : undefined,
  };
}

/**
 * Save a single response (for auto-save)
 */
export async function saveResponse(params: {
  sessionId: string;
  questionId: string;
  answer: AnswerData;
}): Promise<void> {
  const { sessionId, questionId, answer } = params;

  // Verify session is in progress
  const session = await db.assessmentSession.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'IN_PROGRESS') {
    throw new Error('Session is not active');
  }

  // Upsert the response
  await db.assessmentResponse.upsert({
    where: {
      sessionId_questionId: {
        sessionId,
        questionId,
      },
    },
    create: {
      sessionId,
      questionId,
      answer: answer as Prisma.InputJsonValue,
    },
    update: {
      answer: answer as Prisma.InputJsonValue,
      answeredAt: new Date(),
    },
  });
}

/**
 * Submit and score an assessment
 */
export async function submitAssessment(params: {
  sessionId: string;
  responses: ResponseSubmission[];
}): Promise<SessionResult> {
  const { sessionId, responses } = params;

  // Get session with template and questions
  const session = await db.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      template: {
        include: {
          questions: true,
        },
      },
      person: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'IN_PROGRESS') {
    throw new Error('Session is not active');
  }

  // Save all responses
  for (const response of responses) {
    await db.assessmentResponse.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: response.questionId,
        },
      },
      create: {
        sessionId,
        questionId: response.questionId,
        answer: response.answer as Prisma.InputJsonValue,
      },
      update: {
        answer: response.answer as Prisma.InputJsonValue,
        answeredAt: new Date(),
      },
    });
  }

  // Score all responses
  let totalScore = 0;
  const questionsMap = new Map(session.template.questions.map((q) => [q.id, q]));

  for (const response of responses) {
    const question = questionsMap.get(response.questionId);
    if (!question) continue;

    const score = calculateQuestionScore(question.type, question.options, response.answer, question.points);

    // Update response with score
    await db.assessmentResponse.update({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: response.questionId,
        },
      },
      data: { score },
    });

    totalScore += score;
  }

  // Normalize score based on assessment type
  const maxScore = session.template.maxScore;
  let normalizedScore: number;
  let passed: boolean;
  
  if (session.template.type === 'GENERAL_COMPETENCIES') {
    normalizedScore = normalizeGCScore(totalScore, maxScore);
    passed = isGCPassed(normalizedScore);
  } else {
    normalizedScore = normalizeSCScore(totalScore, maxScore);
    passed = isSCPassed(normalizedScore);
  }
  
  const completedAt = new Date();

  // Update session with raw score (for reference) and pass status
  await db.assessmentSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      completedAt,
      score: totalScore, // Keep raw score in session for display purposes
      passed,
    },
  });

  // Update pipeline based on assessment type - using normalized scores
  if (session.template.type === 'GENERAL_COMPETENCIES') {
    await handleGCCompletion(session.personId, normalizedScore, passed);
  } else if (session.template.type === 'SPECIALIZED_COMPETENCIES' && session.applicationId) {
    await handleSCCompletion(
      session.applicationId,
      session.personId,
      normalizedScore,
      passed,
      session.template.id
    );
  }

  // Log the completion
  await createAuditLog({
    personId: session.personId,
    applicationId: session.applicationId || undefined,
    action: `Assessment completed - ${passed ? 'PASSED' : 'FAILED'}`,
    actionType: 'UPDATE',
    details: {
      sessionId,
      templateId: session.templateId,
      rawScore: totalScore,
      maxScore: session.template.maxScore,
      normalizedScore,
      passingScore: session.template.passingScore,
      passed,
    },
  });

  return {
    sessionId,
    score: totalScore,
    maxScore: session.template.maxScore,
    percentage: Math.round((totalScore / session.template.maxScore) * 100),
    passed,
    passingScore: session.template.passingScore,
    completedAt,
  };
}

// =============================================================================
// Scoring Logic
// =============================================================================

/**
 * Calculate score for a single question
 */
function calculateQuestionScore(
  type: QuestionType,
  options: Prisma.JsonValue,
  answer: AnswerData,
  maxPoints: number
): number {
  switch (type) {
    case 'MULTIPLE_CHOICE': {
      if (answer.type !== 'MULTIPLE_CHOICE') return 0;
      const opts = options as unknown as QuestionOption[];
      const selected = opts.find((o) => o.id === answer.selectedOptionId);
      return selected?.points ?? 0;
    }

    case 'MULTIPLE_SELECT': {
      if (answer.type !== 'MULTIPLE_SELECT') return 0;
      const opts = options as unknown as QuestionOption[];
      let score = 0;
      for (const optId of answer.selectedOptionIds) {
        const opt = opts.find((o) => o.id === optId);
        if (opt) score += opt.points;
      }
      return Math.min(score, maxPoints); // Cap at max points
    }

    case 'LIKERT_SCALE': {
      if (answer.type !== 'LIKERT_SCALE') return 0;
      const config = options as unknown as LikertConfig;
      const value = answer.value; // 1-5
      if (value < 1 || value > 5) return 0;
      return config.pointsMapping?.[value - 1] ?? Math.round((value / 5) * maxPoints);
    }

    case 'TRUE_FALSE': {
      if (answer.type !== 'TRUE_FALSE') return 0;
      const config = options as unknown as { correctAnswer: boolean };
      return answer.value === config.correctAnswer ? maxPoints : 0;
    }

    case 'RATING': {
      if (answer.type !== 'RATING') return 0;
      const config = options as unknown as RatingConfig;
      const value = answer.value;
      const range = config.maxValue - config.minValue;
      const normalizedValue = (value - config.minValue) / range;
      return Math.round(normalizedValue * maxPoints);
    }

    case 'TEXT': {
      // Text questions require manual scoring
      return 0;
    }

    default:
      return 0;
  }
}

// =============================================================================
// Pipeline Updates
// =============================================================================

/**
 * Handle General Competencies completion
 * 
 * @param personId - The person's ID
 * @param normalizedScore - Score already normalized to 0-1000 scale
 * @param passed - Whether the assessment was passed (based on normalized score >= 800)
 */
export async function handleGCCompletion(
  personId: string,
  normalizedScore: number,
  passed: boolean
): Promise<void> {
  const threshold = recruitment.assessmentThresholds.generalCompetencies.threshold;
  
  // Update person's GC status with normalized score
  await db.person.update({
    where: { id: personId },
    data: {
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: normalizedScore,
      generalCompetenciesPassedAt: passed ? new Date() : null,
    },
  });

  // If passed, advance all active applications to next stage
  if (passed) {
    // Find applications in APPLICATION or GENERAL_COMPETENCIES stage
    const applications = await db.application.findMany({
      where: {
        personId,
        status: 'ACTIVE',
        currentStage: { in: ['APPLICATION', 'GENERAL_COMPETENCIES'] },
      },
      select: { id: true, currentStage: true },
    });

    for (const app of applications) {
      await db.application.update({
        where: { id: app.id },
        data: {
          currentStage: 'SPECIALIZED_COMPETENCIES',
        },
      });

      await createAuditLog({
        personId,
        applicationId: app.id,
        action: 'Advanced to Specialized Competencies stage',
        actionType: 'STAGE_CHANGE',
        details: {
          previousStage: app.currentStage,
          newStage: 'SPECIALIZED_COMPETENCIES',
          gcScore: normalizedScore,
          gcPassed: passed,
        },
      });
    }
  }

  // Create Assessment record for history with normalized score
  await db.assessment.create({
    data: {
      assessmentType: 'GENERAL_COMPETENCIES',
      score: normalizedScore,
      passed,
      threshold,
      completedAt: new Date(),
      personId,
    },
  });
}

/**
 * Handle Specialized Competencies completion
 * 
 * @param applicationId - The application's ID
 * @param personId - The person's ID
 * @param normalizedScore - Score already normalized to 0-600 scale
 * @param passed - Whether the assessment was passed (based on normalized score >= 400)
 * @param templateId - The assessment template ID
 */
export async function handleSCCompletion(
  applicationId: string,
  personId: string,
  normalizedScore: number,
  passed: boolean,
  templateId: string
): Promise<void> {
  const threshold = recruitment.assessmentThresholds.specializedCompetencies.threshold;
  
  // Create Assessment record with normalized score
  await db.assessment.create({
    data: {
      assessmentType: 'SPECIALIZED_COMPETENCIES',
      score: normalizedScore,
      passed,
      threshold,
      completedAt: new Date(),
      applicationId,
    },
  });

  // If passed, advance to interview stage
  if (passed) {
    await db.application.update({
      where: { id: applicationId },
      data: {
        currentStage: 'INTERVIEW',
      },
    });

    await createAuditLog({
      personId,
      applicationId,
      action: 'Advanced to Interview stage',
      actionType: 'STAGE_CHANGE',
      details: {
        previousStage: 'SPECIALIZED_COMPETENCIES',
        newStage: 'INTERVIEW',
        scScore: normalizedScore,
        scPassed: passed,
        templateId,
      },
    });
  }
}

// =============================================================================
// Session Retrieval
// =============================================================================

/**
 * Get session by ID with all responses
 */
export async function getSessionById(sessionId: string): Promise<AssessmentSessionWithResponses | null> {
  const session = await db.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      template: true,
      responses: {
        include: {
          question: true,
        },
        orderBy: {
          question: {
            order: 'asc',
          },
        },
      },
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return session as AssessmentSessionWithResponses | null;
}

/**
 * Get all sessions for a template
 */
export async function getSessionsByTemplate(templateId: string, options?: {
  page?: number;
  limit?: number;
  status?: SessionStatus;
}): Promise<{
  sessions: Array<{
    id: string;
    status: SessionStatus;
    startedAt: Date;
    completedAt: Date | null;
    score: number | null;
    passed: boolean | null;
    person: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  total: number;
}> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.AssessmentSessionWhereInput = { templateId };

  if (options?.status) {
    where.status = options.status;
  }

  const [sessions, total] = await Promise.all([
    db.assessmentSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        score: true,
        passed: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    db.assessmentSession.count({ where }),
  ]);

  return { sessions, total };
}

/**
 * Get existing responses for a session (for resuming)
 */
export async function getExistingResponses(sessionId: string): Promise<{
  questionId: string;
  answer: AnswerData;
}[]> {
  const responses = await db.assessmentResponse.findMany({
    where: { sessionId },
    select: {
      questionId: true,
      answer: true,
    },
  });

  return responses.map((r) => ({
    questionId: r.questionId,
    answer: r.answer as AnswerData,
  }));
}

/**
 * Expire stale sessions (for cleanup job)
 */
export async function expireStaleSessions(): Promise<number> {
  // Find sessions that have been in progress for more than 24 hours
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await db.assessmentSession.updateMany({
    where: {
      status: 'IN_PROGRESS',
      startedAt: {
        lt: cutoffTime,
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return result.count;
}

/**
 * Mark session as abandoned
 */
export async function abandonSession(sessionId: string): Promise<void> {
  await db.assessmentSession.update({
    where: { id: sessionId },
    data: {
      status: 'ABANDONED',
    },
  });
}
