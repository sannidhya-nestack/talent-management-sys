/**
 * Questionnaire Type Definitions
 *
 * Types for the workspace assessment questionnaire system.
 */

import { QuestionType } from '@/lib/types/firestore';

// Re-export enums for convenience
export type { QuestionType };

// =============================================================================
// Question Option Types
// =============================================================================

/**
 * Option for multiple choice/select questions
 */
export interface QuestionOption {
  id: string;
  text: string;
}

/**
 * Likert scale configuration
 */
export interface LikertConfig {
  minLabel: string; // e.g., "Strongly Disagree"
  maxLabel: string; // e.g., "Strongly Agree"
}

/**
 * Rating configuration
 */
export interface RatingConfig {
  minLabel: string;
  maxLabel: string;
  minValue: number;
  maxValue: number;
}

// =============================================================================
// Question Types
// =============================================================================

/**
 * Base question structure
 */
export interface QuestionBase {
  id: string;
  questionnaireId: string;
  order: number;
  type: QuestionType;
  text: string;
  helpText?: string | null;
  required: boolean;
  section?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Multiple choice question (single select)
 */
export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'MULTIPLE_CHOICE';
  options: QuestionOption[];
}

/**
 * Multiple select question
 */
export interface MultipleSelectQuestion extends QuestionBase {
  type: 'MULTIPLE_SELECT';
  options: QuestionOption[];
}

/**
 * Likert scale question (1-5)
 */
export interface LikertScaleQuestion extends QuestionBase {
  type: 'LIKERT_SCALE';
  options: LikertConfig;
}

/**
 * True/False question
 */
export interface TrueFalseQuestion extends QuestionBase {
  type: 'TRUE_FALSE';
  options: {
    trueLabel?: string;
    falseLabel?: string;
  };
}

/**
 * Free text question
 */
export interface TextQuestion extends QuestionBase {
  type: 'TEXT';
  options?: {
    maxLength?: number;
    placeholder?: string;
  };
}

/**
 * Rating question (1-10)
 */
export interface RatingQuestion extends QuestionBase {
  type: 'RATING';
  options: RatingConfig;
}

/**
 * Union type for all question types
 */
export type Question =
  | MultipleChoiceQuestion
  | MultipleSelectQuestion
  | LikertScaleQuestion
  | TrueFalseQuestion
  | TextQuestion
  | RatingQuestion;

// =============================================================================
// Questionnaire Types
// =============================================================================

/**
 * Questionnaire for creating/editing
 */
export interface QuestionnaireInput {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  headerText?: string;
  footerText?: string;
  questions: QuestionInput[];
}

/**
 * Question input for creating/editing
 */
export interface QuestionInput {
  id?: string; // Set for existing questions when editing
  order: number;
  type: QuestionType;
  text: string;
  helpText?: string;
  required?: boolean;
  options?: QuestionOption[] | LikertConfig | RatingConfig | Record<string, unknown>;
  section?: string;
}

/**
 * Questionnaire with questions for display
 */
export interface QuestionnaireWithQuestions {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  headerText: string | null;
  footerText: string | null;
  createdAt: Date;
  updatedAt: Date;
  questions: Question[];
  creator?: {
    id: string;
    displayName: string;
    email: string;
  };
}

/**
 * Questionnaire list item for admin UI
 */
export interface QuestionnaireListItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  questionsCount: number;
  responsesCount: number;
  createdAt: Date;
  creator: {
    displayName: string;
  };
}

// =============================================================================
// Response Types
// =============================================================================

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
 * Public questionnaire data (for client-facing pages)
 */
export interface PublicQuestionnaireData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  headerText: string | null;
  footerText: string | null;
  questionsCount: number;
}

/**
 * Public question data (for taking questionnaire)
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
 * Question response with question details
 */
export interface QuestionResponseWithQuestion {
  id: string;
  questionnaireId: string;
  questionId: string;
  answer: AnswerData;
  submittedAt: Date;
  question: Question;
}

/**
 * Workspace assessment with responses
 */
export interface WorkspaceAssessmentWithResponses {
  id: string;
  clientId: string;
  questionnaireId: string;
  status: string;
  completedAt: Date | null;
  responses: QuestionResponseWithQuestion[];
  questionnaire: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  client: {
    id: string;
    companyName: string;
  };
}
