/**
 * Form Types
 *
 * Type definitions for the proprietary form builder system.
 * Includes form fields, templates, and submission types.
 */

import type { SubmissionStatus } from '@/lib/generated/prisma/client';

/**
 * Field types supported by the form builder
 */
export type FieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'select'
  | 'file'
  | 'checkbox'
  | 'checkboxGroup'
  | 'url'
  | 'phone'
  | 'number';

/**
 * Validation rules for form fields
 */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  accept?: string; // For file inputs (e.g., '.pdf,.doc')
  maxSize?: number; // Max file size in bytes
  min?: number; // For number inputs
  max?: number; // For number inputs
}

/**
 * Individual form field definition
 */
export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: string[]; // For select/checkbox fields
  helpText?: string;
  mappedTo?: string; // Maps to Person/Application field (e.g., 'person.email')
  defaultValue?: string;
  width?: 'full' | 'half'; // Layout hint
}

/**
 * Form template definition
 */
export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  headerText?: string;
  footerText?: string;
}

/**
 * Application form data (from database)
 */
export interface ApplicationForm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: string;
  isActive: boolean;
  isTemplate: boolean;
  templateId: string | null;
  fields: FormField[];
  headerText: string | null;
  footerText: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Application form with creator info for list views
 */
export interface ApplicationFormListItem {
  id: string;
  name: string;
  slug: string;
  position: string;
  isActive: boolean;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    displayName: string;
  };
  _count: {
    submissions: number;
  };
}

/**
 * Form submission data (from database)
 */
export interface FormSubmission {
  id: string;
  formId: string;
  personId: string | null;
  data: Record<string, unknown>;
  files: FileUploadData[] | null;
  status: SubmissionStatus;
  processedAt: Date | null;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  submittedAt: Date;
}

/**
 * Form submission with form info for list views
 */
export interface FormSubmissionListItem {
  id: string;
  formId: string;
  status: SubmissionStatus;
  submittedAt: Date;
  processedAt: Date | null;
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  form: {
    id: string;
    name: string;
    position: string;
  };
  person?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * File upload metadata
 */
export interface FileUploadData {
  fieldId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

/**
 * Data for creating a new form
 */
export interface CreateFormData {
  name: string;
  slug?: string; // Auto-generated if not provided
  description?: string;
  position: string;
  isActive?: boolean;
  isTemplate?: boolean;
  templateId?: string;
  fields: FormField[];
  headerText?: string;
  footerText?: string;
  createdBy: string;
}

/**
 * Data for updating a form
 */
export interface UpdateFormData {
  name?: string;
  slug?: string;
  description?: string | null;
  position?: string;
  isActive?: boolean;
  isTemplate?: boolean;
  fields?: FormField[];
  headerText?: string | null;
  footerText?: string | null;
}

/**
 * Data for creating a form submission
 */
export interface CreateSubmissionData {
  formId: string;
  data: Record<string, unknown>;
  files?: FileUploadData[];
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Public form data (safe to expose to applicants)
 */
export interface PublicFormData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: string;
  fields: FormField[];
  headerText: string | null;
  footerText: string | null;
}

/**
 * Form submission result
 */
export interface SubmissionResult {
  success: boolean;
  submissionId?: string;
  message: string;
  errors?: Record<string, string>;
}

/**
 * Field mapping for extracting data from submissions
 */
export interface FieldMapping {
  fieldId: string;
  mappedTo: string;
}

/**
 * Extracted person data from form submission
 */
export interface ExtractedPersonData {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  state?: string;
  portfolioLink?: string;
  educationLevel?: string;
}

/**
 * Extracted application data from form submission
 */
export interface ExtractedApplicationData {
  position: string;
  resumeUrl?: string;
  academicBackground?: string;
  previousExperience?: string;
  videoLink?: string;
  otherFileUrl?: string;
  hasResume: boolean;
  hasAcademicBg: boolean;
  hasVideoIntro: boolean;
  hasPreviousExp: boolean;
  hasOtherFile: boolean;
}

/**
 * Form statistics
 */
export interface FormStats {
  totalForms: number;
  activeForms: number;
  templates: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  processedSubmissions: number;
  failedSubmissions: number;
}

/**
 * Slug validation result
 */
export interface SlugValidation {
  isValid: boolean;
  isAvailable: boolean;
  suggestion?: string;
}
