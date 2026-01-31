/**
 * Assessment Type Definitions
 *
 * Types for the internal assessment/questionnaire builder system.
 * Supports both General Competencies (GC) and Specialized Competencies (SC) assessments.
 */

import type {
  AssessmentTemplate as PrismaAssessmentTemplate,
  AssessmentQuestion as PrismaAssessmentQuestion,
  AssessmentSession as PrismaAssessmentSession,
  AssessmentResponse as PrismaAssessmentResponse,
  AssessmentTemplateType,
  QuestionType,
  SessionStatus,
} from '@/lib/generated/prisma/client';

// Re-export enums for convenience
export type { AssessmentTemplateType, QuestionType, SessionStatus };

// =============================================================================
// Question Option Types
// =============================================================================

/**
 * Option for multiple choice/select questions
 */
export interface QuestionOption {
  id: string;
  text: string;
  points: number;
  isCorrect?: boolean; // For true/false and single correct answer questions
}

/**
 * Likert scale configuration
 */
export interface LikertConfig {
  minLabel: string; // e.g., "Strongly Disagree"
  maxLabel: string; // e.g., "Strongly Agree"
  pointsMapping: number[]; // Points for each value 1-5
}

/**
 * Rating configuration
 */
export interface RatingConfig {
  minLabel: string;
  maxLabel: string;
  minValue: number;
  maxValue: number;
  pointsPerUnit: number; // Points per rating unit
}

// =============================================================================
// Question Types
// =============================================================================

/**
 * Base question structure
 */
export interface AssessmentQuestionBase {
  id: string;
  templateId: string;
  order: number;
  type: QuestionType;
  text: string;
  helpText?: string | null;
  required: boolean;
  points: number;
  section?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Multiple choice question (single select)
 */
export interface MultipleChoiceQuestion extends AssessmentQuestionBase {
  type: 'MULTIPLE_CHOICE';
  options: QuestionOption[];
}

/**
 * Multiple select question
 */
export interface MultipleSelectQuestion extends AssessmentQuestionBase {
  type: 'MULTIPLE_SELECT';
  options: QuestionOption[];
}

/**
 * Likert scale question (1-5)
 */
export interface LikertScaleQuestion extends AssessmentQuestionBase {
  type: 'LIKERT_SCALE';
  options: LikertConfig;
}

/**
 * True/False question
 */
export interface TrueFalseQuestion extends AssessmentQuestionBase {
  type: 'TRUE_FALSE';
  options: {
    correctAnswer: boolean;
    trueLabel?: string;
    falseLabel?: string;
  };
}

/**
 * Free text question (manual scoring)
 */
export interface TextQuestion extends AssessmentQuestionBase {
  type: 'TEXT';
  options?: {
    maxLength?: number;
    placeholder?: string;
  };
}

/**
 * Rating question (1-10)
 */
export interface RatingQuestion extends AssessmentQuestionBase {
  type: 'RATING';
  options: RatingConfig;
}

/**
 * Union type for all question types
 */
export type AssessmentQuestion =
  | MultipleChoiceQuestion
  | MultipleSelectQuestion
  | LikertScaleQuestion
  | TrueFalseQuestion
  | TextQuestion
  | RatingQuestion;

// =============================================================================
// Template Types
// =============================================================================

/**
 * Assessment template for creating/editing
 */
export interface AssessmentTemplateInput {
  name: string;
  slug: string;
  description?: string;
  type: AssessmentTemplateType;
  position?: string;
  isActive?: boolean;
  passingScore: number;
  maxScore: number;
  timeLimit?: number;
  headerText?: string;
  footerText?: string;
  questions: AssessmentQuestionInput[];
}

/**
 * Question input for creating/editing
 */
export interface AssessmentQuestionInput {
  id?: string; // Set for existing questions when editing
  order: number;
  type: QuestionType;
  text: string;
  helpText?: string;
  required?: boolean;
  points: number;
  options?: QuestionOption[] | LikertConfig | RatingConfig | Record<string, unknown>;
  section?: string;
}

/**
 * Assessment template with questions for display
 */
export interface AssessmentTemplateWithQuestions extends PrismaAssessmentTemplate {
  questions: PrismaAssessmentQuestion[];
  creator?: {
    id: string;
    displayName: string;
    email: string;
  };
}

/**
 * Template list item for admin UI
 */
export interface AssessmentTemplateListItem {
  id: string;
  name: string;
  slug: string;
  type: AssessmentTemplateType;
  position: string | null;
  isActive: boolean;
  passingScore: number;
  maxScore: number;
  timeLimit: number | null;
  questionsCount: number;
  sessionsCount: number;
  createdAt: Date;
  creator: {
    displayName: string;
  };
}

// =============================================================================
// Session & Response Types
// =============================================================================

/**
 * Session with responses for display
 */
export interface AssessmentSessionWithResponses extends PrismaAssessmentSession {
  template: PrismaAssessmentTemplate;
  responses: (PrismaAssessmentResponse & {
    question: PrismaAssessmentQuestion;
  })[];
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Answer data for different question types
 */
export type AnswerData =
  | { type: 'MULTIPLE_CHOICE'; selectedOptionId: string }
  | { type: 'MULTIPLE_SELECT'; selectedOptionIds: string[] }
  | { type: 'LIKERT_SCALE'; value: number }
  | { type: 'TRUE_FALSE'; value: boolean }
  | { type: 'TEXT'; value: string }
  | { type: 'RATING'; value: number };

/**
 * Response submission
 */
export interface ResponseSubmission {
  questionId: string;
  answer: AnswerData;
}

/**
 * Session start request
 */
export interface StartSessionRequest {
  personId: string;
  applicationId?: string;
}

/**
 * Session submit request
 */
export interface SubmitSessionRequest {
  sessionId: string;
  responses: ResponseSubmission[];
}

/**
 * Session result
 */
export interface SessionResult {
  sessionId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
  completedAt: Date;
}

// =============================================================================
// Public Assessment Types (for candidate-facing pages)
// =============================================================================

/**
 * Public assessment data (no sensitive info)
 */
export interface PublicAssessmentData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: AssessmentTemplateType;
  position: string | null;
  timeLimit: number | null;
  headerText: string | null;
  footerText: string | null;
  questionsCount: number;
}

/**
 * Public question data (for taking assessment)
 */
export interface PublicQuestion {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  helpText: string | null;
  required: boolean;
  section: string | null;
  options?: QuestionOption[] | LikertConfig | RatingConfig | Record<string, unknown>;
}

/**
 * Data needed to render assessment taking page
 */
export interface AssessmentTakingData {
  template: PublicAssessmentData;
  questions: PublicQuestion[];
  session: {
    id: string;
    startedAt: Date;
    expiresAt?: Date; // If timeLimit is set
  };
  existingResponses?: {
    questionId: string;
    answer: AnswerData;
  }[];
}

// =============================================================================
// Email Integration Types
// =============================================================================

/**
 * Template selection for email sending
 */
export interface AssessmentTemplateForEmail {
  id: string;
  name: string;
  slug: string;
  type: AssessmentTemplateType;
  position: string | null;
}

/**
 * Assessment URL generation params
 */
export interface AssessmentUrlParams {
  slug: string;
  personId: string;
  applicationId?: string;
}
